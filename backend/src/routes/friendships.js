const router = require('express').Router();
const { verifyToken } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/discovery.controller');

router.use(verifyToken);

// POST /friendships — like or reject a user
// Body: { userId: number, action: 'like' | 'reject' }
router.post('/', ctrl.friendship);

// GET /friendships — accepted friends list
router.get('/', ctrl.getFriends);

module.exports = router;
