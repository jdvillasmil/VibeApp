require('dotenv').config();
const pool = require('./db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      bio TEXT,
      avatar_url VARCHAR(500),
      interests TEXT[],
      vibe VARCHAR(50),
      vibe_updated_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friendships (
      id SERIAL PRIMARY KEY,
      requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      addressee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(requester_id, addressee_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chats (
      id SERIAL PRIMARY KEY,
      user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      body TEXT,
      image_url VARCHAR(500),
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      payload JSONB,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fcm_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id)`);
  console.log('Migration complete — all tables created');
  await pool.end();
}

migrate().catch((err) => {
  console.warn('Migration failed:', err);
  process.exit(1);
});
