const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth.middleware');
const pool = require('../config/db');

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, payload, read_at, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    return res.json({ data: result.rows, error: null, message: 'OK' });
  } catch (err) {
    console.warn('[notifications] fetch failed:', err);
    return res.status(500).json({ data: null, error: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' });
  }
});

router.patch('/read', async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    return res.json({ data: null, error: null, message: 'Marked as read' });
  } catch (err) {
    console.warn('[notifications] mark-read failed:', err);
    return res.status(500).json({ data: null, error: 'INTERNAL_ERROR', message: 'Failed to mark notifications as read' });
  }
});

module.exports = router;
