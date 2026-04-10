const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { uploadChatImage } = require('../middleware/upload');
const ctrl = require('../controllers/chats.controller');

router.use(verifyToken);

router.get('/', ctrl.getChats);
router.get('/:id/messages', ctrl.getMessages);
router.post('/:id/messages', ctrl.sendMessage);
router.post('/:id/images', uploadChatImage.single('image'), ctrl.sendImage);

module.exports = router;
