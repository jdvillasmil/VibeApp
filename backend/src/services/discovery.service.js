const pool = require('../config/db');
const notifService = require('./notifications.service');

const SAFE_USER = 'u.id, u.name, u.avatar_url, u.bio, u.interests, u.vibe, u.vibe_updated_at';
const ALLOWED_VIBES = ['Gaming', 'Music', 'Studying', 'Hang', 'Chill'];

async function getDiscoverUsers(currentUserId) {
  // Exclude self and anyone already swiped (any direction)
  const result = await pool.query(
    `SELECT ${SAFE_USER}
     FROM users u
     WHERE u.id != $1
       AND u.id NOT IN (
         SELECT addressee_id FROM friendships WHERE requester_id = $1
         UNION
         SELECT requester_id FROM friendships WHERE addressee_id = $1
       )
     ORDER BY RANDOM()
     LIMIT 20`,
    [currentUserId]
  );
  return result.rows;
}

async function likeUser(requesterId, addresseeId) {
  if (requesterId === addresseeId) {
    const err = new Error('Cannot like yourself');
    err.status = 400;
    throw err;
  }

  await pool.query(
    `INSERT INTO friendships (requester_id, addressee_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (requester_id, addressee_id) DO NOTHING`,
    [requesterId, addresseeId]
  );

  // Check if the other user already liked back
  const mutual = await pool.query(
    `SELECT id FROM friendships
     WHERE requester_id = $1 AND addressee_id = $2 AND status = 'pending'`,
    [addresseeId, requesterId]
  );

  if (mutual.rowCount > 0) {
    // Mutual match — accept both sides
    await pool.query(
      `UPDATE friendships SET status = 'accepted'
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [requesterId, addresseeId]
    );

    // Create chat room if not already exists
    let chat = await pool.query(
      `SELECT id FROM chats
       WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
      [requesterId, addresseeId]
    );

    if (chat.rowCount === 0) {
      chat = await pool.query(
        `INSERT INTO chats (user1_id, user2_id) VALUES ($1, $2) RETURNING id`,
        [requesterId, addresseeId]
      );
    }

    const chatId = chat.rows[0].id;

    // Notify both users of the match — non-blocking
    const matcherResult = await pool.query('SELECT name FROM users WHERE id = $1', [requesterId]);
    const matcherName = matcherResult.rows[0]?.name || 'Someone';
    const matchedResult = await pool.query('SELECT name FROM users WHERE id = $1', [addresseeId]);
    const matchedName = matchedResult.rows[0]?.name || 'Someone';

    notifService.saveNotification(addresseeId, 'new_match', { chatId, withUserId: requesterId, withUserName: matcherName }).catch(() => {});
    notifService.sendFcmPush(addresseeId, {
      title: `Match con ${matcherName}!`,
      body: 'Tenéis un chat listo para empezar.',
      data: { type: 'new_match', chatId: String(chatId) },
    }).catch(() => {});

    notifService.saveNotification(requesterId, 'new_match', { chatId, withUserId: addresseeId, withUserName: matchedName }).catch(() => {});
    notifService.sendFcmPush(requesterId, {
      title: `Match con ${matchedName}!`,
      body: 'Tenéis un chat listo para empezar.',
      data: { type: 'new_match', chatId: String(chatId) },
    }).catch(() => {});

    return { matched: true, chatId };
  }

  // One-sided like (NOTF-02) — notify addressee
  const requesterResult = await pool.query('SELECT name FROM users WHERE id = $1', [requesterId]);
  const requesterName = requesterResult.rows[0]?.name || 'Someone';

  notifService.saveNotification(addresseeId, 'friend_request', {
    fromUserId: requesterId,
    fromUserName: requesterName,
  }).catch(() => {});
  notifService.sendFcmPush(addresseeId, {
    title: `${requesterName} quiere ser tu amigo`,
    body: 'Ábrela app para responder',
    data: { type: 'friend_request', userId: String(requesterId) },
  }).catch(() => {});

  return { matched: false };
}

async function rejectUser(requesterId, addresseeId) {
  if (requesterId === addresseeId) {
    const err = new Error('Cannot reject yourself');
    err.status = 400;
    throw err;
  }
  await pool.query(
    `INSERT INTO friendships (requester_id, addressee_id, status)
     VALUES ($1, $2, 'rejected')
     ON CONFLICT (requester_id, addressee_id) DO UPDATE SET status = 'rejected'`,
    [requesterId, addresseeId]
  );
  return { rejected: true };
}

async function getFriends(userId) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.avatar_url, u.bio, u.vibe, u.vibe_updated_at,
            c.id AS chat_id
     FROM friendships f
     JOIN users u ON (
       CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END = u.id
     )
     LEFT JOIN chats c ON (
       (c.user1_id = $1 AND c.user2_id = u.id) OR
       (c.user1_id = u.id AND c.user2_id = $1)
     )
     WHERE (f.requester_id = $1 OR f.addressee_id = $1)
       AND f.status = 'accepted'
     ORDER BY u.name`,
    [userId]
  );
  return result.rows;
}

// Update vibe — validates against allowed values
async function updateVibe(userId, vibe) {
  if (!ALLOWED_VIBES.includes(vibe)) {
    const err = new Error(`Vibe must be one of: ${ALLOWED_VIBES.join(', ')}`);
    err.status = 400;
    throw err;
  }
  const result = await pool.query(
    `UPDATE users SET vibe = $1, vibe_updated_at = NOW()
     WHERE id = $2
     RETURNING id, vibe, vibe_updated_at`,
    [vibe, userId]
  );
  return result.rows[0];
}

module.exports = { getDiscoverUsers, likeUser, rejectUser, getFriends, updateVibe };
