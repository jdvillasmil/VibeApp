const usersService = require('../services/users.service');
const { updateVibe: updateVibeService } = require('../services/discovery.service');

async function getMe(req, res) {
  try {
    const user = await usersService.getMe(req.user.id);
    return res.status(200).json({ data: user, error: null, message: 'OK' });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ data: null, error: err.message, message: 'Error fetching profile' });
  }
}

async function updateMe(req, res) {
  try {
    let { name, bio, interests } = req.body;

    // interests may arrive as a JSON string when sent via FormData
    if (typeof interests === 'string') {
      try {
        interests = JSON.parse(interests);
      } catch {
        // Leave as-is if not valid JSON (e.g., plain comma-separated string)
        interests = interests.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }

    const user = await usersService.updateMe(req.user.id, { name, bio, interests });
    return res.status(200).json({ data: user, error: null, message: 'Profile updated' });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ data: null, error: err.message, message: 'Error updating profile' });
  }
}

async function updateAvatar(req, res) {
  if (!req.file) {
    return res.status(400).json({ data: null, error: 'NO_FILE', message: 'Avatar file required' });
  }

  try {
    const result = await usersService.updateAvatar(req.user.id, req.file.path);
    return res.status(200).json({ data: { avatar_url: result.avatar_url }, error: null, message: 'Avatar updated' });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ data: null, error: err.message, message: 'Error updating avatar' });
  }
}

async function updateVibe(req, res) {
  try {
    const { vibe } = req.body;
    if (!vibe) {
      return res.status(400).json({ data: null, error: 'Validation error', message: 'vibe is required' });
    }
    const result = await updateVibeService(req.user.id, vibe);
    return res.status(200).json({ data: result, error: null, message: 'Vibe updated' });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ data: null, error: err.message, message: err.message });
  }
}

module.exports = { getMe, updateMe, updateAvatar, updateVibe };
