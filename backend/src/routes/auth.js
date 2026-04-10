const express = require('express');
const router = express.Router();
const { uploadAvatar } = require('../middleware/upload');
const { register, login } = require('../controllers/auth.controller');

// POST /auth/register — multipart form with optional avatar file
router.post('/register', uploadAvatar.single('avatar'), register);

// POST /auth/login — JSON body
router.post('/login', login);

module.exports = router;
