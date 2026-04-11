const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth.middleware');
const { uploadAvatar } = require('../middleware/upload');
const { getMe, updateMe, updateAvatar, updateVibe } = require('../controllers/users.controller');
const usersService = require('../services/users.service');

// All routes in this file require a valid JWT
router.use(verifyToken);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.patch('/me/avatar', uploadAvatar.single('avatar'), updateAvatar);
router.patch('/me/vibe', updateVibe);

router.post('/me/fcm-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ data: null, error: 'MISSING_TOKEN', message: 'token required' });
    await usersService.saveFcmToken(req.user.id, token);
    return res.json({ data: null, error: null, message: 'FCM token saved' });
  } catch (err) {
    console.warn('[fcm-token] save failed:', err);
    return res.status(500).json({ data: null, error: 'INTERNAL_ERROR', message: 'Failed to save token' });
  }
});

module.exports = router;
