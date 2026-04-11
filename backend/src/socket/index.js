const jwt = require('jsonwebtoken');
const chatsService = require('../services/chats.service');
const notifService = require('../services/notifications.service');
const pool = require('../config/db');

function setupSocket(io) {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    // Join personal room for match notifications
    socket.join(`user_${userId}`);

    // Join a chat room
    socket.on('join_chat', (chatId) => {
      const roomName = `chat_${chatId}`;
      socket.join(roomName);
    });

    // Leave a chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat_${chatId}`);
    });

    // Send a text message
    socket.on('send_message', async ({ chatId, body }) => {
      try {
        if (!chatId || !body || !String(body).trim()) return;
        const message = await chatsService.saveMessage({
          chatId: Number(chatId),
          senderId: userId,
          body: String(body).trim(),
        });
        io.to(`chat_${chatId}`).emit('new_message', message);

        // Push to recipient if they're not in the chat room (app is backgrounded or closed)
        try {
          const chatRow = await pool.query(
            'SELECT user1_id, user2_id FROM chats WHERE id = $1',
            [Number(chatId)]
          );
          if (chatRow.rowCount > 0) {
            const { user1_id, user2_id } = chatRow.rows[0];
            const recipientId = user1_id === userId ? user2_id : user1_id;

            // Check if recipient has an active socket in this chat room
            const roomMembers = io.sockets.adapter.rooms.get(`chat_${chatId}`);
            const recipientRoom = io.sockets.adapter.rooms.get(`user_${recipientId}`);
            const recipientSocketIds = recipientRoom ? [...recipientRoom] : [];
            const recipientInChat = recipientSocketIds.some((sid) => roomMembers?.has(sid));

            if (!recipientInChat) {
              const senderName = message.sender_name || socket.user.email;
              const previewBody = String(body).trim().slice(0, 80);
              notifService.saveNotification(recipientId, 'new_message', {
                chatId: Number(chatId),
                senderName,
              }).catch(() => {});
              notifService.sendFcmPush(recipientId, {
                title: senderName,
                body: previewBody,
                data: { type: 'new_message', chatId: String(chatId) },
              }).catch(() => {});
            }
          }
        } catch {
          // Non-critical — push failure must not affect message delivery
        }
      } catch {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Send an image (imageUrl already uploaded via REST /chats/:id/images)
    socket.on('send_image', async ({ chatId, imageUrl }) => {
      try {
        if (!chatId || !imageUrl) return;
        const message = await chatsService.saveMessage({
          chatId: Number(chatId),
          senderId: userId,
          imageUrl,
        });
        io.to(`chat_${chatId}`).emit('new_message', message);

        // Push to recipient if they're not in the chat room
        try {
          const chatRow = await pool.query(
            'SELECT user1_id, user2_id FROM chats WHERE id = $1',
            [Number(chatId)]
          );
          if (chatRow.rowCount > 0) {
            const { user1_id, user2_id } = chatRow.rows[0];
            const recipientId = user1_id === userId ? user2_id : user1_id;

            const roomMembers = io.sockets.adapter.rooms.get(`chat_${chatId}`);
            const recipientRoom = io.sockets.adapter.rooms.get(`user_${recipientId}`);
            const recipientSocketIds = recipientRoom ? [...recipientRoom] : [];
            const recipientInChat = recipientSocketIds.some((sid) => roomMembers?.has(sid));

            if (!recipientInChat) {
              const senderName = message.sender_name || socket.user.email;
              notifService.saveNotification(recipientId, 'new_message', {
                chatId: Number(chatId),
                senderName,
              }).catch(() => {});
              notifService.sendFcmPush(recipientId, {
                title: senderName,
                body: 'Imagen',
                data: { type: 'new_message', chatId: String(chatId) },
              }).catch(() => {});
            }
          }
        } catch {
          // Non-critical — push failure must not affect image delivery
        }
      } catch {
        socket.emit('error', { message: 'Failed to send image' });
      }
    });

    // Typing indicator
    socket.on('typing', ({ chatId }) => {
      if (!chatId) return;
      socket.to(`chat_${chatId}`).emit('typing', { userId, chatId });
    });

    socket.on('stop_typing', ({ chatId }) => {
      if (!chatId) return;
      socket.to(`chat_${chatId}`).emit('stop_typing', { userId, chatId });
    });

    // Mark messages as read
    socket.on('read_messages', async ({ chatId }) => {
      try {
        if (!chatId) return;
        await chatsService.markRead(Number(chatId), userId);
        io.to(`chat_${chatId}`).emit('messages_read', { chatId, userId });
      } catch {
        // Non-critical, ignore
      }
    });

    socket.on('disconnect', () => {
      // Socket.io handles room cleanup automatically
    });
  });
}

module.exports = setupSocket;
