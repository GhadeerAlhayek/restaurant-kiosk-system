const express = require('express');
const router = express.Router();

router.post('/test', async (req, res) => {
  res.json({ success: true, message: 'Printer test (not implemented yet)' });
});

router.post('/receipt', async (req, res) => {
  res.json({ success: true, message: 'Receipt printed (not implemented yet)' });
});

module.exports = router;
