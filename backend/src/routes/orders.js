const express = require('express');
const router = express.Router();
const { query, queryOne, run, db } = require('../config/database');
const logger = require('../utils/logger');

async function generateOrderNumber() {
  const date = new Date();
  const today = date.toISOString().split('T')[0]; // YYYY-MM-DD

  // Get count of orders created today
  const result = await queryOne(
    `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = DATE(?)`,
    [today]
  );

  const orderCount = (result?.count || 0) + 1;

  // Simple format: just the order number (1, 2, 3, etc.)
  return orderCount.toString();
}

router.post('/', async (req, res) => {
  try {
    const { device_id, items, notes } = req.body;
    if (!device_id || !items || items.length === 0) {
      return res.status(400).json({ success: false, error: 'device_id and items required' });
    }

    const orderNumber = await generateOrderNumber();

    // Separate regular items and build-your-own items
    const regularItems = items.filter(item => item.menu_item_id);
    const buildYourOwnItems = items.filter(item => item.build_your_own);

    // Fetch menu items for regular items
    let menuItemMap = new Map();
    if (regularItems.length > 0) {
      const menuItemIds = regularItems.map(item => item.menu_item_id);
      const placeholders = menuItemIds.map(() => '?').join(',');
      const menuItems = await query(
        `SELECT id, price, name, image_url FROM menu_items WHERE id IN (${placeholders})`,
        menuItemIds
      );
      menuItemMap = new Map(menuItems.map(item => [item.id, item]));
    }

    let totalAmount = 0;
    const orderItems = items.map(item => {
      if (item.build_your_own) {
        // Build-your-own item (no menu_item_id)
        const price = parseFloat(item.price);
        const subtotal = price * item.quantity;
        totalAmount += subtotal;
        return {
          ...item,
          price_at_order: price,
          subtotal,
          name: item.name,
          image_url: null // Build-your-own items don't have images
        };
      } else {
        // Regular menu item
        const menuItem = menuItemMap.get(item.menu_item_id);
        if (!menuItem) throw new Error(`Menu item ${item.menu_item_id} not found`);

        // Use price from frontend if provided (for customized items), otherwise use menu price
        const price = item.price !== undefined ? parseFloat(item.price) : parseFloat(menuItem.price);
        const subtotal = price * item.quantity;
        totalAmount += subtotal;
        return {
          ...item,
          price_at_order: price,
          subtotal,
          name: menuItem.name,
          image_url: menuItem.image_url
        };
      }
    });

    const orderResult = await run(
      `INSERT INTO orders (order_number, device_id, total_amount, notes, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [orderNumber, device_id, totalAmount, notes || null]
    );

    const orderId = orderResult.lastID;

    for (const item of orderItems) {
      const itemResult = await run(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, price_at_order, subtotal, instructions, name)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.menu_item_id || null, item.quantity, item.price_at_order, item.subtotal, item.instructions || null, item.build_your_own ? item.name : null]
      );

      const orderItemId = itemResult.lastID;

      // Store customizations if present
      if (item.customizations) {
        if (item.customizations.size) {
          await run(
            `INSERT INTO order_item_customizations (order_item_id, type, name, price)
             VALUES (?, 'size', ?, ?)`,
            [orderItemId, item.customizations.size.name, item.customizations.size.price]
          );
        }
        if (item.customizations.ingredients && item.customizations.ingredients.length > 0) {
          for (const ingredient of item.customizations.ingredients) {
            await run(
              `INSERT INTO order_item_customizations (order_item_id, type, name, price)
               VALUES (?, 'ingredient', ?, ?)`,
              [orderItemId, ingredient.name, ingredient.price]
            );
          }
        }
      }

      // Store build-your-own customizations
      if (item.build_your_own) {
        if (item.build_your_own.size) {
          await run(
            `INSERT INTO order_item_customizations (order_item_id, type, name, price)
             VALUES (?, 'size', ?, ?)`,
            [orderItemId, item.build_your_own.size.name, item.build_your_own.size.price]
          );
        }
        if (item.build_your_own.ingredients && item.build_your_own.ingredients.length > 0) {
          for (const ingredient of item.build_your_own.ingredients) {
            await run(
              `INSERT INTO order_item_customizations (order_item_id, type, name, price)
               VALUES (?, 'ingredient', ?, ?)`,
              [orderItemId, ingredient.name, ingredient.price]
            );
          }
        }
      }
    }

    const order = await queryOne('SELECT * FROM orders WHERE id = ?', [orderId]);
    const completeOrder = { ...order, items: orderItems };

    const io = req.app.get('io');
    io.to('kitchen').to('admin').emit('order:new', completeOrder);

    res.status(201).json({
      success: true,
      data: completeOrder,
      order_number: orderNumber,
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { status, device_id, limit = 100 } = req.query;
    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND status = ?`;
    }
    if (device_id) {
      params.push(device_id);
      sql += ` AND device_id = ?`;
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const orders = await query(sql, params);
    const ordersWithItems = await Promise.all(orders.map(async order => {
      const items = await query(
        `SELECT oi.*, COALESCE(oi.name, mi.name) as name, mi.image_url
         FROM order_items oi
         LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
         WHERE oi.order_id = ?`,
        [order.id]
      );

      // Fetch customizations for each item
      const itemsWithCustomizations = await Promise.all(items.map(async item => {
        const customizations = await query(
          `SELECT type, name, price FROM order_item_customizations WHERE order_item_id = ?`,
          [item.id]
        );

        // Group customizations by type
        const size = customizations.find(c => c.type === 'size');
        const ingredients = customizations.filter(c => c.type === 'ingredient');

        return {
          ...item,
          customizations: customizations.length > 0 ? { size, ingredients } : null
        };
      }));

      return { ...order, items: itemsWithCustomizations };
    }));

    res.json({ success: true, data: ordersWithItems, total: ordersWithItems.length });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const existing = await queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const completedAt = status === 'completed' ? new Date().toISOString() : null;

    await run(
      'UPDATE orders SET status = ?, completed_at = COALESCE(?, completed_at) WHERE id = ?',
      [status, completedAt, id]
    );

    const updated = await queryOne('SELECT * FROM orders WHERE id = ?', [id]);

    // Emit to kitchen and admin
    const io = req.app.get('io');
    io.to('kitchen').to('admin').emit('order:status-changed', { id: parseInt(id), status });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/orders/:id/confirm - Confirm order with payment method
router.patch('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method } = req.body;

    if (!payment_method || !['card', 'cash'].includes(payment_method)) {
      return res.status(400).json({ success: false, error: 'Valid payment_method required (card or cash)' });
    }

    const existing = await queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Can only confirm pending orders' });
    }

    await run(
      'UPDATE orders SET status = ?, payment_method = ? WHERE id = ?',
      ['confirmed', payment_method, id]
    );

    const updated = await queryOne('SELECT * FROM orders WHERE id = ?', [id]);

    // Get items for the complete order
    const items = await query(
      `SELECT oi.*, mi.name, mi.image_url
       FROM order_items oi
       LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
       WHERE oi.order_id = ?`,
      [id]
    );

    const completeOrder = { ...updated, items };

    // Emit to kitchen - order is now confirmed and can be prepared
    const io = req.app.get('io');
    io.to('kitchen').emit('order:confirmed', completeOrder);
    io.to('admin').emit('order:status-changed', { id: parseInt(id), status: 'confirmed', payment_method });

    res.json({ success: true, data: completeOrder });
  } catch (error) {
    logger.error('Error confirming order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE old orders - cleanup orders older than 5 hours
router.delete('/cleanup', async (req, res) => {
  try {
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();

    // First delete order items for old orders
    await run(
      `DELETE FROM order_items WHERE order_id IN (
        SELECT id FROM orders WHERE created_at < ? AND status IN ('completed', 'cancelled')
      )`,
      [fiveHoursAgo]
    );

    // Then delete the old orders
    const result = await run(
      `DELETE FROM orders WHERE created_at < ? AND status IN ('completed', 'cancelled')`,
      [fiveHoursAgo]
    );

    logger.info(`Cleaned up ${result.changes} old orders`);

    res.json({
      success: true,
      message: `Deleted ${result.changes} orders older than 5 hours`,
      deleted_count: result.changes
    });
  } catch (error) {
    logger.error('Error cleaning up orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
