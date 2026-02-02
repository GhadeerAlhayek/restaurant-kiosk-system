const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

router.get('/sales', async (req, res) => {
  try {
    const rows = query('SELECT COUNT(*) as total FROM orders');
    res.json({ success: true, data: { total: rows[0].total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
