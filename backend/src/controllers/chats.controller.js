const chatsService = require('../services/chats.service');

async function getChats(req, res) {
  try {
    const chats = await chatsService.getChats(req.user.id);
    return res.json({ data: chats, error: null, message: 'OK' });
  } catch (err) {
    return res.status(500).json({ data: null, error: err.message, message: 'Server error' });
  }
}

async function getMessages(req, res) {
  try {
    const chatId = parseInt(req.params.id, 10);
    if (isNaN(chatId)) return res.status(400).json({ data: null, error: 'Invalid ID', message: 'Chat ID must be a number' });
    const messages = await chatsService.getMessages(chatId, req.user.id);
    return res.json({ data: messages, error: null, message: 'OK' });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ data: null, error: err.message, message: err.message });
  }
}

async function sendMessage(req, res) {
  try {
    const chatId = parseInt(req.params.id, 10);
    if (isNaN(chatId)) return res.status(400).json({ data: null, error: 'Invalid ID', message: 'Chat ID must be a number' });
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ data: null, error: 'Validation error', message: 'Message body is required' });
    const message = await chatsService.saveMessage({ chatId, senderId: req.user.id, body: body.trim() });

    // Emit to socket room if io available
    if (req.io) {
      req.io.to(`chat_${chatId}`).emit('new_message', message);
    }

    return res.status(201).json({ data: message, error: null, message: 'Message sent' });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ data: null, error: err.message, message: err.message });
  }
}

async function sendImage(req, res) {
  try {
    const chatId = parseInt(req.params.id, 10);
    if (isNaN(chatId)) return res.status(400).json({ data: null, error: 'Invalid ID', message: 'Chat ID must be a number' });
    if (!req.file) return res.status(400).json({ data: null, error: 'No file', message: 'Image is required' });
    const message = await chatsService.saveMessage({ chatId, senderId: req.user.id, imageUrl: req.file.path });

    if (req.io) {
      req.io.to(`chat_${chatId}`).emit('new_message', message);
    }

    return res.status(201).json({ data: message, error: null, message: 'Image sent' });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ data: null, error: err.message, message: err.message });
  }
}

module.exports = { getChats, getMessages, sendMessage, sendImage };
