const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está configurado. Crea una base PostgreSQL en Neon y pega su URL en .env o Render.');
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(LOWER(email)) WHERE email IS NOT NULL`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saves (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS friends (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'accepted',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, friend_id),
      CHECK (user_id <> friend_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS matchmaking_queue (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      horse_snapshot JSONB NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_matches (
      id SERIAL PRIMARY KEY,
      player1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      player2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      player1_horse JSONB NOT NULL,
      player2_horse JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function run(sql, params = []) {
  const result = await pool.query(sql, params);
  return result;
}

async function get(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0];
}

module.exports = { pool, initDb, run, get };
