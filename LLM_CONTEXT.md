# LLM Context - Restaurant Kiosk System

This file is for any LLM (Claude, GPT, etc.) that is about to work on this project.
Read this carefully before touching anything.

---

## What This Project Is

A self-service restaurant ordering kiosk system running on Raspberry Pi devices.
Customers walk up to a touchscreen, browse the menu, customize their order, and get a printed receipt.
Staff manage orders from an admin panel and see real-time updates in the kitchen.

**This is a real production system running in a restaurant. Be careful.**

---

## Hardware Setup

- **Server Pi** (`kioskserver.local`): Runs the Node.js backend. Serves the frontend as static files. Has a thermal printer connected via USB.
- **Kiosk Pis** (1 or more): Run Chromium in kiosk mode pointed at `http://kioskserver.local:3000`. No local server, just a browser.
- All Pis are on the same local network.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express + SQLite |
| Frontend | React + Vite (built to static files) |
| Real-time | Socket.io |
| Image uploads | Multer |
| Printing | node-thermal-printer + CUPS |
| Database migrations | Custom JS migration runner |

---

## Critical Architecture Decisions (Do Not Change Without Understanding)

### 1. Frontend is pre-built and committed to git

The `frontend/kiosk-app/dist/` folder is **committed to git**. This is intentional.
The Pi just does `git pull` and gets the new build immediately. No build step needed on the Pi.

**Consequence**: Every time you change frontend code, you MUST rebuild before committing:
```bash
cd frontend/kiosk-app
mv .env.local .env.local.backup   # hide the dev override
npm run build                      # build with production .env
mv .env.local.backup .env.local   # restore for local dev
git add dist/
git commit -m "..."
```

If you forget this, the Pi will show the old frontend.

### 2. Two .env files for frontend

- `.env` — production, points to `http://kioskserver.local:3000`. This is committed to git.
- `.env.local` — local Mac dev, points to `http://localhost:3000`. This is **gitignored**.

Vite prioritizes `.env.local` over `.env`. So on your Mac, `.env.local` takes effect.
On the Pi (where `.env.local` doesn't exist), `.env` is used.

**Common mistake**: Building the frontend while `.env.local` exists bakes `localhost:3000` into the Pi build, causing the Pi to try to connect to itself instead of the server.

### 3. API URL in AdminPage.jsx

`AdminPage.jsx` uses `const API_URL = '/api'` (relative path), NOT the `VITE_API_URL` env variable.
This works because the admin panel is served from the same origin as the backend (`kioskserver.local:3000`).
The kiosk pages (MenuPage, CustomizePage, KioskApp) use `import { API_URL } from '../config'` which reads the env variable.

**Do not** change the admin panel to use the env variable — it will break when served from the Pi.

### 4. Database migrations

Migrations are numbered SQL files in `backend/src/db/migrations/`.
The migration runner tracks which ones have been executed in a `migrations` table.
**Always create a new numbered file** — never modify existing migrations.
Current highest: `015_add_customization_steps_to_menu_items.sql`
Next should be: `016_...`

After adding a migration:
- On Mac: `cd backend && npm run migrate`
- On Pi: `cd backend && npm run migrate` (after git pull)

### 5. Image uploads — two separate upload systems

**Ingredient images** (category ingredients): stored in `backend/uploads/`, served at `/uploads/`.
- Route: `backend/src/routes/categories.js`
- Multer destination: `path.join(__dirname, '../../uploads')`
- URL format: `/uploads/filename.jpg`

**Menu item images**: stored in `assets/menu-images/`, served at `/images/`.
- Route: `backend/src/routes/menu.js`
- Multer destination: `path.join(__dirname, '../../../assets/menu-images')`
- URL format: `filename.jpg` (just the filename, frontend prepends `${API_URL}/images/`)

These are different paths. Do not mix them up.

### 6. Build-your-own / Compose category system

Categories have two special flags:
- `is_customizable`: Has sizes and ingredients (e.g. sandwiches with size options)
- `is_build_your_own`: Customer composes the item step by step from ingredients

For `is_build_your_own` categories, the customization flow is defined as `customization_steps` JSON.

**The key architectural detail**: A category's `customization_steps` applies to ALL items in that category.
But each menu item can ALSO have its own `customization_steps` that **overrides** the category's.

Example: Category "Tacos" (build_your_own) has default steps.
- "Tacos M": has item-level `customization_steps` → max 3 ingredients
- "Tacos L": has item-level `customization_steps` → max 5 ingredients

In `CustomizePage.jsx`:
```js
const steps = selectedItem?.customization_steps || category?.customization_steps || []
```

This means item steps take priority over category steps.

The admin panel has a visual UI to configure item-level steps (in the menu item edit modal, there's a checkbox "Personnaliser les étapes pour cet item").

---

## Database Schema (Current)

Key tables:
- `menu_items`: `id, name, description, base_type, price, image_url, ingredients, is_available, is_extra, category_id, display_order, customization_steps`
- `categories`: `id, name, display_name, icon, display_order, is_active, is_customizable, is_build_your_own, show_supplements, customization_steps`
- `category_sizes`: sizes for customizable categories
- `category_ingredients`: ingredients for customizable/build-your-own categories
- `orders`: `id, order_number, device_id, status, total_amount, payment_method, ...`
- `order_items`: `id, order_id, menu_item_id, quantity, price_at_order, subtotal, name, ...`

The `customization_steps` column in both `menu_items` and `categories` stores JSON as TEXT.

---

## API Routes Summary

```
GET    /api/menu                     → all menu items
GET    /api/menu/:id                 → single item
POST   /api/menu                     → create item (multipart/form-data)
PUT    /api/menu/:id                 → update item (multipart/form-data)
DELETE /api/menu/:id                 → delete item
PATCH  /api/menu/:id/availability    → toggle available

GET    /api/categories               → all categories with sizes+ingredients
POST   /api/categories               → create category
PUT    /api/categories/:id           → update category
DELETE /api/categories/:id           → delete category
POST   /api/categories/:id/sizes     → add size
PUT    /api/categories/:id/sizes/:sid
DELETE /api/categories/:id/sizes/:sid
POST   /api/categories/:id/ingredients   → add ingredient (multipart/form-data)
PUT    /api/categories/:id/ingredients/:iid
DELETE /api/categories/:id/ingredients/:iid

GET    /api/orders                   → all orders
POST   /api/orders                   → create order
PATCH  /api/orders/:id/status        → update status
PATCH  /api/orders/:id/confirm       → confirm + set payment method

POST   /api/printer/test             → test print
POST   /api/printer/receipt          → print receipt

GET    /api/health                   → health check
```

---

## Frontend Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `KioskApp.jsx` | Home screen, start order |
| `/menu` | `MenuPage.jsx` | Browse menu by category |
| `/customize` | `CustomizePage.jsx` | Build-your-own step flow |
| `/admin` | `admin/AdminPage.jsx` | Admin panel (all-in-one) |

The admin panel is a single large component file with sub-components:
- `DashboardPage`
- `CategoriesPage` + `CustomizationManager`
- `MenuItemsPage`
- `OrdersPage`

---

## Known Issues / Watch Out For

1. **Building frontend**: Always disable `.env.local` before building for production (see above).

2. **Admin panel `customization_steps` for categories**: When editing a category in the admin panel, the ingredient checkboxes in customization steps only show if you're **editing** an existing category (uses `editingCategory?.ingredients`). When **creating** a new category, you need to save it first, then add ingredients via "Gérer", then re-edit to configure steps.

3. **`base_type` field**: Legacy from when this was a pizza-only system. All items require a `base_type` (`tomato` or `cream`) in the database. The admin panel only shows this field for items in a "pizza" category. Other items get `tomato` as default. This field is mostly unused now.

4. **Supplements page**: After customization, if a category has `show_supplements: true`, a supplements page appears showing items marked as `is_extra: true` from the same category.

5. **Order flow**: Kiosk → creates order with status `pending` → Admin confirms it (selects cash/card) → status becomes `confirmed` → Kitchen sees it → Kitchen completes it → status `completed`.

6. **Static files on Pi**: The backend serves:
   - `frontend/kiosk-app/dist/` at `/` (the React app)
   - `backend/uploads/` at `/uploads/` (ingredient images)
   - `assets/menu-images/` at `/images/` (menu item images)

---

## How to Add a New Feature (Checklist)

1. If database change needed → create new migration file in `backend/src/db/migrations/`
2. If backend API change needed → update relevant route in `backend/src/routes/`
3. If frontend change needed → update React component in `frontend/kiosk-app/src/`
4. Run `npm run migrate` locally
5. Test locally (`npm run dev` for backend, `npm run dev` for frontend)
6. Build frontend: disable `.env.local`, run `npm run build`, re-enable `.env.local`
7. Commit everything including `dist/`
8. Push
9. On Pi: `git pull` + `npm run migrate` (if migration added) + `sudo systemctl restart kiosk-server` or `sudo reboot`

---

## File Locations for Common Changes

| Task | File |
|---|---|
| Add menu item field | `backend/src/routes/menu.js` + migration + `AdminPage.jsx` |
| Add category field | `backend/src/routes/categories.js` + migration + `AdminPage.jsx` |
| Change kiosk UI | `frontend/kiosk-app/src/pages/MenuPage.jsx` or `CustomizePage.jsx` |
| Change admin panel | `frontend/kiosk-app/src/pages/admin/AdminPage.jsx` |
| Change order flow | `backend/src/routes/orders.js` + `KioskApp.jsx` |
| Change receipt format | `backend/src/services/printerService.js` |
| Change API URL (dev) | `frontend/kiosk-app/.env.local` |
| Change API URL (prod) | `frontend/kiosk-app/.env` |
