const pool = require('../config/db');

async function getMe(userId) {
  const result = await pool.query(
    `SELECT id, name, email, bio, avatar_url, interests, vibe, vibe_updated_at, created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return result.rows[0];
}

async function updateMe(userId, { name, bio, interests }) {
  // Build dynamic SET clause — only update provided fields
  const fields = { name, bio, interests };
  const updates = [];
  const values = [];
  let paramIdx = 1;

  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) {
      updates.push(`${key} = $${paramIdx}`);
      values.push(val);
      paramIdx++;
    }
  }

  // Nothing to update — return current profile
  if (updates.length === 0) {
    return getMe(userId);
  }

  values.push(userId);

  const result = await pool.query(
    `UPDATE users
     SET ${updates.join(', ')}
     WHERE id = $${paramIdx}
     RETURNING id, name, email, bio, avatar_url, interests, vibe, vibe_updated_at, created_at`,
    values
  );

  return result.rows[0];
}

async function updateAvatar(userId, avatarUrl) {
  const result = await pool.query(
    `UPDATE users
     SET avatar_url = $1
     WHERE id = $2
     RETURNING id, avatar_url`,
    [avatarUrl, userId]
  );

  return result.rows[0];
}

module.exports = { getMe, updateMe, updateAvatar };
