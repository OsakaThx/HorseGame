CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saves (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saves_updated_at ON saves(updated_at);

CREATE TABLE IF NOT EXISTS friends (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);

CREATE TABLE IF NOT EXISTS matchmaking_queue (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  horse_snapshot JSONB NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 2,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS online_matches (
  id SERIAL PRIMARY KEY,
  player1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  player1_horse JSONB NOT NULL,
  player2_horse JSONB NOT NULL,
  race_seed TEXT,
  max_players INTEGER NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'lobby',
  mode_votes JSONB NOT NULL DEFAULT '{}'::jsonb,
  selected_mode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
