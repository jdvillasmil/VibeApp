const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middleware/auth.middleware');
const { uploadAvatar } = require('../middleware/upload');
const { getMe, updateMe, updateAvatar } = require('../controllers/users.controller');

// All routes in this file require a valid JWT
router.use(verifyToken);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.patch('/me/avatar', uploadAvatar.single('avatar'), updateAvatar);

module.exports = router;
