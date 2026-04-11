const pool = require('../config/db');
const admin = require('../config/firebase');

async function getFcmToken(userId) {
  const result = await pool.query(
    'SELECT token FROM fcm_tokens WHERE user_id = $1',
    [userId]
  );
  return result.rows[0]?.token || null;
}

async function saveNotification(userId, type, payload) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)',
    [userId, type, JSON.stringify(payload)]
  );
}

async function sendFcmPush(userId, { title, body, data }) {
  if (!admin.apps.length) return; // Firebase not configured — skip silently
  const token = await getFcmToken(userId);
  if (!token) return;

  const message = {
    notification: { title, body },
    data: data || {},
    token,
    android: { priority: 'high' },
  };

  try {
    await admin.messaging().send(message);
  } catch (err) {
    if (err.code === 'messaging/registration-token-not-registered') {
      await pool.query('DELETE FROM fcm_tokens WHERE user_id = $1', [userId]);
    } else {
      console.warn('[fcm] send failed:', err.code);
    }
  }
}

module.exports = { getFcmToken, saveNotification, sendFcmPush };
