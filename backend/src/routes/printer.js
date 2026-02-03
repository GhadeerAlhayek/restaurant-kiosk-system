const express = require('express');
const router = express.Router();
const printerService = require('../services/printerService');
const logger = require('../utils/logger');

// Test printer
router.post('/test', async (req, res) => {
  try {
    const { device_id } = req.body;
    if (!device_id) {
      return res.status(400).json({ success: false, error: 'device_id required' });
    }

    const result = await printerService.printTest(device_id);
    res.json(result);
  } catch (error) {
    logger.error('Printer test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Print receipt
router.post('/receipt', async (req, res) => {
  try {
    const { device_id, order } = req.body;
    if (!device_id || !order) {
      return res.status(400).json({ success: false, error: 'device_id and order required' });
    }

    const result = await printerService.printReceipt(device_id, order);
    res.json(result);
  } catch (error) {
    logger.error('Receipt print failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List available printers
router.get('/list', async (req, res) => {
  try {
    const printers = await printerService.listPrinters();
    res.json({ success: true, printers });
  } catch (error) {
    logger.error('List printers failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
