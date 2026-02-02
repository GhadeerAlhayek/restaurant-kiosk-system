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

// GET /api/categories - Get all categories
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;

    let sql = 'SELECT * FROM categories WHERE 1=1';
    const params = [];

    if (active !== undefined) {
      params.push(active === 'true' ? 1 : 0);
      sql += ` AND is_active = ?`;
    }

    sql += ' ORDER BY display_order, id';

    const rows = await query(sql, params);

    // Fetch sizes and ingredients for each category
    const data = await Promise.all(rows.map(async (row) => {
      let sizes = [];
      let ingredients = [];

      if (row.is_customizable === 1 || row.is_build_your_own === 1) {
        sizes = await query(
          'SELECT * FROM category_sizes WHERE category_id = ? AND is_active = 1 ORDER BY display_order, id',
          [row.id]
        );
        ingredients = await query(
          'SELECT * FROM category_ingredients WHERE category_id = ? AND is_active = 1 ORDER BY display_order, id',
          [row.id]
        );
      }

      return {
        ...row,
        is_active: row.is_active === 1,
        is_customizable: row.is_customizable === 1,
        is_build_your_own: row.is_build_your_own === 1,
        sizes,
        ingredients
      };
    }));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/categories/:id - Get single category
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);

    if (!row) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // Fetch sizes and ingredients if customizable or build-your-own
    let sizes = [];
    let ingredients = [];

    if (row.is_customizable === 1 || row.is_build_your_own === 1) {
      sizes = await query(
        'SELECT * FROM category_sizes WHERE category_id = ? ORDER BY display_order, id',
        [row.id]
      );
      ingredients = await query(
        'SELECT * FROM category_ingredients WHERE category_id = ? ORDER BY display_order, id',
        [row.id]
      );
    }

    res.json({
      success: true,
      data: {
        ...row,
        is_active: row.is_active === 1,
        is_customizable: row.is_customizable === 1,
        is_build_your_own: row.is_build_your_own === 1,
        sizes,
        ingredients
      },
    });
  } catch (error) {
    logger.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  try {
    const { name, display_name, icon, display_order, is_active, is_customizable, is_build_your_own } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({
        success: false,
        error: 'Name and display_name are required',
      });
    }

    const result = await run(
      `INSERT INTO categories (name, display_name, icon, display_order, is_active, is_customizable, is_build_your_own)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, display_name, icon || '', display_order || 0, is_active !== false ? 1 : 0, is_customizable ? 1 : 0, is_build_your_own ? 1 : 0]
    );

    const newCategory = await queryOne('SELECT * FROM categories WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      data: {
        ...newCategory,
        is_active: newCategory.is_active === 1,
        is_customizable: newCategory.is_customizable === 1,
        is_build_your_own: newCategory.is_build_your_own === 1,
        sizes: [],
        ingredients: []
      },
    });
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, display_name, icon, display_order, is_active, is_customizable, is_build_your_own } = req.body;

    const existing = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    await run(
      `UPDATE categories SET
        name = COALESCE(?, name),
        display_name = COALESCE(?, display_name),
        icon = COALESCE(?, icon),
        display_order = COALESCE(?, display_order),
        is_active = COALESCE(?, is_active),
        is_customizable = COALESCE(?, is_customizable),
        is_build_your_own = COALESCE(?, is_build_your_own)
       WHERE id = ?`,
      [name, display_name, icon, display_order, is_active !== undefined ? (is_active ? 1 : 0) : null, is_customizable !== undefined ? (is_customizable ? 1 : 0) : null, is_build_your_own !== undefined ? (is_build_your_own ? 1 : 0) : null, id]
    );

    const updated = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);

    // Fetch sizes and ingredients if customizable or build-your-own
    let sizes = [];
    let ingredients = [];

    if (updated.is_customizable === 1 || updated.is_build_your_own === 1) {
      sizes = await query(
        'SELECT * FROM category_sizes WHERE category_id = ? ORDER BY display_order, id',
        [updated.id]
      );
      ingredients = await query(
        'SELECT * FROM category_ingredients WHERE category_id = ? ORDER BY display_order, id',
        [updated.id]
      );
    }

    res.json({
      success: true,
      data: {
        ...updated,
        is_active: updated.is_active === 1,
        is_customizable: updated.is_customizable === 1,
        is_build_your_own: updated.is_build_your_own === 1,
        sizes,
        ingredients
      },
    });
  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // Check if category has menu items
    const items = await query('SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?', [id]);
    if (items[0].count > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with menu items. Remove items first.',
      });
    }

    await run('DELETE FROM categories WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============= SIZES ENDPOINTS =============

// POST /api/categories/:id/sizes - Add size to category (no image needed)
router.post('/:id/sizes', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, display_order } = req.body;

    logger.info('POST /api/categories/:id/sizes - Request:', {
      categoryId: id,
      body: req.body
    });

    if (!name || !price || price === '' || price === undefined) {
      logger.warn('Validation failed:', { name, price });
      return res.status(400).json({
        success: false,
        error: 'Name and price are required',
      });
    }

    const category = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    const result = await run(
      `INSERT INTO category_sizes (category_id, name, price, display_order)
       VALUES (?, ?, ?, ?)`,
      [id, name, price, display_order || 0]
    );

    const newSize = await queryOne('SELECT * FROM category_sizes WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      data: newSize,
    });
  } catch (error) {
    logger.error('Error creating size:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT /api/categories/:id/sizes/:sizeId - Update size (no image)
router.put('/:id/sizes/:sizeId', async (req, res) => {
  try {
    const { sizeId } = req.params;
    const { name, price, display_order, is_active } = req.body;

    const existing = await queryOne('SELECT * FROM category_sizes WHERE id = ?', [sizeId]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Size not found',
      });
    }

    await run(
      `UPDATE category_sizes SET
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        display_order = COALESCE(?, display_order),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, price, display_order, is_active !== undefined ? (is_active ? 1 : 0) : null, sizeId]
    );

    const updated = await queryOne('SELECT * FROM category_sizes WHERE id = ?', [sizeId]);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Error updating size:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// DELETE /api/categories/:id/sizes/:sizeId - Delete size
router.delete('/:id/sizes/:sizeId', async (req, res) => {
  try {
    const { sizeId } = req.params;

    const existing = await queryOne('SELECT * FROM category_sizes WHERE id = ?', [sizeId]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Size not found',
      });
    }

    await run('DELETE FROM category_sizes WHERE id = ?', [sizeId]);

    res.json({
      success: true,
      message: 'Size deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting size:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============= INGREDIENTS ENDPOINTS =============

// POST /api/categories/:id/ingredients - Add ingredient to category
router.post('/:id/ingredients', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, display_order } = req.body;

    logger.info('POST /api/categories/:id/ingredients - Request:', {
      categoryId: id,
      body: req.body,
      file: req.file?.filename
    });

    if (!name || !price || price === '' || price === undefined) {
      logger.warn('Validation failed:', { name, price });
      return res.status(400).json({
        success: false,
        error: 'Name and price are required',
      });
    }

    const category = await queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    const imageUrl = req.file ? req.file.filename : null;

    const result = await run(
      `INSERT INTO category_ingredients (category_id, name, price, display_order, image_url)
       VALUES (?, ?, ?, ?, ?)`,
      [id, name, price, display_order || 0, imageUrl]
    );

    const newIngredient = await queryOne('SELECT * FROM category_ingredients WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      data: newIngredient,
    });
  } catch (error) {
    logger.error('Error creating ingredient:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT /api/categories/:id/ingredients/:ingredientId - Update ingredient
router.put('/:id/ingredients/:ingredientId', upload.single('image'), async (req, res) => {
  try {
    const { ingredientId } = req.params;
    const { name, price, display_order, is_active } = req.body;

    const existing = await queryOne('SELECT * FROM category_ingredients WHERE id = ?', [ingredientId]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    const imageUrl = req.file ? req.file.filename : null;

    await run(
      `UPDATE category_ingredients SET
        name = COALESCE(?, name),
        price = COALESCE(?, price),
        display_order = COALESCE(?, display_order),
        is_active = COALESCE(?, is_active),
        image_url = COALESCE(?, image_url)
       WHERE id = ?`,
      [name, price, display_order, is_active !== undefined ? (is_active ? 1 : 0) : null, imageUrl, ingredientId]
    );

    const updated = await queryOne('SELECT * FROM category_ingredients WHERE id = ?', [ingredientId]);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Error updating ingredient:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// DELETE /api/categories/:id/ingredients/:ingredientId - Delete ingredient
router.delete('/:id/ingredients/:ingredientId', async (req, res) => {
  try {
    const { ingredientId } = req.params;

    const existing = await queryOne('SELECT * FROM category_ingredients WHERE id = ?', [ingredientId]);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Ingredient not found',
      });
    }

    await run('DELETE FROM category_ingredients WHERE id = ?', [ingredientId]);

    res.json({
      success: true,
      message: 'Ingredient deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting ingredient:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
