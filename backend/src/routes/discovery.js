const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/discovery.controller');

router.use(verifyToken);

// GET /discovery — swipe card stack
router.get('/discovery', ctrl.discover);

// POST /friendships — like or reject a user
// Body: { userId: number, action: 'like' | 'reject' }
router.post('/friendships', ctrl.friendship);

// GET /friendships — accepted friends list
router.get('/friendships', ctrl.getFriends);

module.exports = router;
