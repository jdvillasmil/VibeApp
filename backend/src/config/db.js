require('dotenv').config();
const { Pool } = require('pg');

console.log('[db] DATABASE_URL set:', !!process.env.DATABASE_URL);
console.log('[db] JWT_SECRET set:', !!process.env.JWT_SECRET);
console.log('[db] NODE_ENV:', process.env.NODE_ENV || '(not set)');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err);
});

module.exports = pool;
