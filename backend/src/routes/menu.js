const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../config/database');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../assets/menu-images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// GET /api/menu - Get all menu items
router.get('/', async (req, res) => {
  try {
    const { base_type, available, category_id } = req.query;

    let sql = `
      SELECT m.*, c.display_name as category_name, c.icon as category_icon
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (base_type) {
      params.push(base_type);
      sql += ` AND m.base_type = ?`;
    }

    if (available !== undefined) {
      params.push(available === 'true' ? 1 : 0);
      sql += ` AND m.is_available = ?`;
    }

    if (category_id) {
      params.push(category_id);
      sql += ` AND m.category_id = ?`;
    }

    sql += ' ORDER BY m.display_order, m.id';

    const rows = await query(sql, params);

    const data = rows.map(row => ({
      ...row,
      ingredients: row.ingredients ? JSON.parse(row.ingredients) : [],
      is_available: row.is_available === 1
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/menu/:id - Get single menu item
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await queryOne(`
      SELECT m.*, c.display_name as category_name
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE m.id = ?
    `, [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    const data = {
      ...row,
      ingredients: row.ingredients ? JSON.parse(row.ingredients) : [],
      is_available: row.is_available === 1
    };

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error fetching menu item:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/menu - Create new menu item
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, description, base_type, price, ingredients, is_available, category_id, display_order } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required',
      });
    }

    const image_url = req.file ? req.file.filename : null;
    const ingredientsJson = ingredients ? (typeof ingredients === 'string' ? ingredients : JSON.stringify(ingredients)) : null;

    // Parse category_id as integer, handle empty string
    const parsedCategoryId = category_id && category_id !== '' ? parseInt(category_id) : null;

    const result = await run(
      `INSERT INTO menu_items (name, description, base_type, price, image_url, ingredients, is_available, category_id, display_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        base_type || 'tomato',
        parseFloat(price),
        image_url,
        ingredientsJson,
        is_available !== 'false' ? 1 : 0,
        parsedCategoryId,
        display_order ? parseInt(display_order) : 0
      ]
    );

    const newItem = await queryOne('SELECT * FROM menu_items WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      data: {
        ...newItem,
        ingredients: newItem.ingredients ? JSON.parse(newItem.ingredients) : [],
        is_available: newItem.is_available === 1
      },
    });
  } catch (error) {
    logger.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT /api/menu/:id - Update menu item
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, base_type, price, ingredients, is_available, category_id, display_order } = req.body;

    const existing = await queryOne('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    let image_url = existing.image_url;
    if (req.file) {
      // Delete old image if exists
      if (existing.image_url) {
        const oldImagePath = path.join(__dirname, '../../../assets/menu-images', existing.image_url);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      image_url = req.file.filename;
    }

    const ingredientsJson = ingredients !== undefined
      ? (typeof ingredients === 'string' ? ingredients : JSON.stringify(ingredients))
      : existing.ingredients;

    // Parse category_id as integer
    const parsedCategoryId = category_id !== undefined && category_id !== '' ? parseInt(category_id) : null;

    await run(
      `UPDATE menu_items SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        base_type = COALESCE(?, base_type),
        price = COALESCE(?, price),
        image_url = ?,
        ingredients = ?,
        is_available = COALESCE(?, is_available),
        category_id = ?,
        display_order = COALESCE(?, display_order)
       WHERE id = ?`,
      [
        name,
        description,
        base_type,
        price ? parseFloat(price) : null,
        image_url,
        ingredientsJson,
        is_available !== undefined ? (is_available === 'true' || is_available === true ? 1 : 0) : null,
        parsedCategoryId !== null ? parsedCategoryId : existing.category_id,
        display_order ? parseInt(display_order) : null,
        id
      ]
    );

    const updated = await queryOne('SELECT * FROM menu_items WHERE id = ?', [id]);

    res.json({
      success: true,
      data: {
        ...updated,
        ingredients: updated.ingredients ? JSON.parse(updated.ingredients) : [],
        is_available: updated.is_available === 1
      },
    });
  } catch (error) {
    logger.error('Error updating menu item:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// DELETE /api/menu/:id - Delete menu item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await queryOne('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    // Delete image file if exists
    if (existing.image_url) {
      const imagePath = path.join(__dirname, '../../../assets/menu-images', existing.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await run('DELETE FROM menu_items WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting menu item:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PATCH /api/menu/:id/availability - Toggle availability
router.patch('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_available } = req.body;

    const existing = await queryOne('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    await run('UPDATE menu_items SET is_available = ? WHERE id = ?', [is_available ? 1 : 0, id]);

    res.json({
      success: true,
      data: {
        id: parseInt(id),
        is_available: is_available
      },
    });
  } catch (error) {
    logger.error('Error updating availability:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
