const pool = require('../config/db');

async function verifyMember(chatId, userId) {
  const result = await pool.query(
    'SELECT id FROM chats WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
    [chatId, userId]
  );
  if (result.rowCount === 0) {
    const err = new Error('Chat not found or access denied');
    err.status = 403;
    throw err;
  }
}

async function getChats(userId) {
  const result = await pool.query(
    `SELECT c.id AS chat_id,
            u.id, u.name, u.avatar_url, u.vibe,
            m.body AS last_message_body,
            m.image_url AS last_message_image,
            m.created_at AS last_message_at,
            (SELECT COUNT(*) FROM messages ms
             WHERE ms.chat_id = c.id AND ms.sender_id != $1 AND ms.read_at IS NULL) AS unread_count
     FROM chats c
     JOIN users u ON u.id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END
     LEFT JOIN LATERAL (
       SELECT body, image_url, created_at FROM messages
       WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1
     ) m ON true
     WHERE c.user1_id = $1 OR c.user2_id = $1
     ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
    [userId]
  );
  return result.rows;
}

async function getMessages(chatId, userId) {
  await verifyMember(chatId, userId);
  const result = await pool.query(
    `SELECT m.id, m.chat_id, m.sender_id, m.body, m.image_url, m.read_at, m.created_at,
            u.name AS sender_name, u.avatar_url AS sender_avatar
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.chat_id = $1
     ORDER BY m.created_at ASC
     LIMIT 200`,
    [chatId]
  );
  return result.rows;
}

async function saveMessage({ chatId, senderId, body, imageUrl }) {
  await verifyMember(chatId, senderId);
  if (!body && !imageUrl) {
    const err = new Error('Message must have text or image');
    err.status = 400;
    throw err;
  }

  // Sanitize body length
  const safeBody = body ? body.slice(0, 2000) : null;

  const result = await pool.query(
    `INSERT INTO messages (chat_id, sender_id, body, image_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, chat_id, sender_id, body, image_url, read_at, created_at`,
    [chatId, senderId, safeBody, imageUrl || null]
  );

  // Fetch sender info
  const senderResult = await pool.query('SELECT name, avatar_url FROM users WHERE id = $1', [senderId]);
  const sender = senderResult.rows[0];

  return {
    ...result.rows[0],
    sender_name: sender.name,
    sender_avatar: sender.avatar_url,
  };
}

async function markRead(chatId, userId) {
  await verifyMember(chatId, userId);
  await pool.query(
    `UPDATE messages SET read_at = NOW()
     WHERE chat_id = $1 AND sender_id != $2 AND read_at IS NULL`,
    [chatId, userId]
  );
}

module.exports = { getChats, getMessages, saveMessage, markRead };
