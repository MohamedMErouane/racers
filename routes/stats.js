const express = require('express');
const router = express.Router();

// Placeholder stats routes
router.get('/status', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
