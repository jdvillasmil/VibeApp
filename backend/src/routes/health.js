const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    data: { status: 'ok', timestamp: new Date().toISOString() },
    error: null,
    message: 'Service is healthy',
  });
});

module.exports = router;
