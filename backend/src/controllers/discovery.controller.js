const discoveryService = require('../services/discovery.service');

async function discover(req, res) {
  try {
    const users = await discoveryService.getDiscoverUsers(req.user.id);
    return res.json({ data: users, error: null, message: 'OK' });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message, message: 'Server error' });
  }
}

// POST /friendships — handles both like and reject in one endpoint
async function friendship(req, res) {
  try {
    const { userId, action } = req.body;

    if (!userId || !action) {
      return res.status(400).json({ data: null, error: 'Validation error', message: 'userId and action are required' });
    }
    if (!['like', 'reject'].includes(action)) {
      return res.status(400).json({ data: null, error: 'Validation error', message: 'action must be "like" or "reject"' });
    }

    const addresseeId = parseInt(userId, 10);
    if (isNaN(addresseeId)) {
      return res.status(400).json({ data: null, error: 'Invalid ID', message: 'userId must be a number' });
    }

    if (action === 'reject') {
      const result = await discoveryService.rejectUser(req.user.id, addresseeId);
      return res.json({ data: result, error: null, message: 'User rejected' });
    }

    // action === 'like'
    const result = await discoveryService.likeUser(req.user.id, addresseeId);

    if (result.matched && req.io) {
      req.io.to(`user_${req.user.id}`).emit('new_match', { chatId: result.chatId, userId: addresseeId });
      req.io.to(`user_${addresseeId}`).emit('new_match', { chatId: result.chatId, userId: req.user.id });
    }

    return res.json({
      data: result,
      error: null,
      message: result.matched ? 'Matched!' : 'Like sent',
    });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ data: null, error: err.message, message: err.message });
  }
}

async function getFriends(req, res) {
  try {
    const friends = await discoveryService.getFriends(req.user.id);
    return res.json({ data: friends, error: null, message: 'OK' });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message, message: 'Server error' });
  }
}

module.exports = { discover, friendship, getFriends };
