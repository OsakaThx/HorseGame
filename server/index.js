require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initDb, run, get } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));

function makeToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'Horse Racing Legend API' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const username = String(req.body.username || email.split('@')[0] || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Correo inválido' });
    if (password.length < 6) return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await run('INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username', [email, username, passwordHash]);
    const user = result.rows[0];

    res.status(201).json({ token: makeToken(user), user });
  } catch (err) {
    if (err && err.code === '23505') return res.status(409).json({ error: 'Ese usuario ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error registrando usuario' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await get('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);

    if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    res.json({ token: makeToken(user), user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error iniciando sesión' });
  }
});

app.get('/api/me', auth, async (req, res) => {
  const user = await get('SELECT id, email, username FROM users WHERE id = $1', [req.user.id]);
  res.json({ user });
});

app.get('/api/save', auth, async (req, res) => {
  try {
    const row = await get('SELECT payload, updated_at FROM saves WHERE user_id = $1', [req.user.id]);
    if (!row) return res.json({ exists: false, save: null });
    res.json({ exists: true, save: row.payload, updatedAt: row.updated_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error cargando partida' });
  }
});

app.put('/api/save', auth, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object' || !payload.jugador) {
      return res.status(400).json({ error: 'Payload de partida inválido' });
    }

    await run(
      `INSERT INTO saves (user_id, payload, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload, updated_at=NOW()`,
      [req.user.id, JSON.stringify(payload)]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error guardando partida' });
  }
});

app.delete('/api/save', auth, async (req, res) => {
  try {
    await run('DELETE FROM saves WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error borrando partida' });
  }
});

app.get('/api/friends', auth, async (req, res) => {
  try {
    const result = await run(
      `SELECT u.id, u.email, u.username, f.created_at
       FROM friends f
       JOIN users u ON u.id = f.friend_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json({ friends: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error cargando amigos' });
  }
});

app.post('/api/friends', auth, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Correo requerido' });
    const friend = await get('SELECT id, email, username FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (!friend) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (friend.id === req.user.id) return res.status(400).json({ error: 'No puedes agregarte a ti mismo' });

    await run(
      `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)
       ON CONFLICT (user_id, friend_id) DO NOTHING`,
      [req.user.id, friend.id]
    );
    await run(
      `INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)
       ON CONFLICT (user_id, friend_id) DO NOTHING`,
      [friend.id, req.user.id]
    );
    res.status(201).json({ friend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error agregando amigo' });
  }
});

app.delete('/api/friends/:id', auth, async (req, res) => {
  try {
    const friendId = Number(req.params.id);
    await run('DELETE FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)', [req.user.id, friendId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando amigo' });
  }
});

app.post('/api/matchmaking/join', auth, async (req, res) => {
  try {
    const horse = req.body.horse;
    if (!horse || !horse.id || !horse.nombre) return res.status(400).json({ error: 'Caballo inválido' });

    const opponent = await get(
      `SELECT q.user_id, q.horse_snapshot, u.email, u.username
       FROM matchmaking_queue q
       JOIN users u ON u.id = q.user_id
       WHERE q.user_id <> $1
       ORDER BY q.joined_at ASC
       LIMIT 1`,
      [req.user.id]
    );

    if (opponent) {
      await run('DELETE FROM matchmaking_queue WHERE user_id IN ($1, $2)', [req.user.id, opponent.user_id]);
      const result = await run(
        `INSERT INTO online_matches (player1_id, player2_id, player1_horse, player2_horse)
         VALUES ($1, $2, $3::jsonb, $4::jsonb)
         RETURNING id, created_at`,
        [opponent.user_id, req.user.id, JSON.stringify(opponent.horse_snapshot), JSON.stringify(horse)]
      );
      return res.status(201).json({
        status: 'matched',
        match: {
          id: result.rows[0].id,
          createdAt: result.rows[0].created_at,
          opponent: { id: opponent.user_id, email: opponent.email, username: opponent.username },
          opponentHorse: opponent.horse_snapshot,
          yourHorse: horse
        }
      });
    }

    await run(
      `INSERT INTO matchmaking_queue (user_id, horse_snapshot, joined_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET horse_snapshot=excluded.horse_snapshot, joined_at=NOW()`,
      [req.user.id, JSON.stringify(horse)]
    );
    res.json({ status: 'waiting' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error buscando partida' });
  }
});

app.get('/api/matchmaking/status', auth, async (req, res) => {
  try {
    const match = await get(
      `SELECT m.id, m.player1_id, m.player2_id, m.player1_horse, m.player2_horse, m.created_at,
              u1.email AS p1_email, u1.username AS p1_username,
              u2.email AS p2_email, u2.username AS p2_username
       FROM online_matches m
       JOIN users u1 ON u1.id = m.player1_id
       JOIN users u2 ON u2.id = m.player2_id
       WHERE (m.player1_id = $1 OR m.player2_id = $1)
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (match) {
      const isP1 = match.player1_id === req.user.id;
      return res.json({
        status: 'matched',
        match: {
          id: match.id,
          createdAt: match.created_at,
          opponent: isP1
            ? { id: match.player2_id, email: match.p2_email, username: match.p2_username }
            : { id: match.player1_id, email: match.p1_email, username: match.p1_username },
          opponentHorse: isP1 ? match.player2_horse : match.player1_horse,
          yourHorse: isP1 ? match.player1_horse : match.player2_horse
        }
      });
    }

    const queued = await get('SELECT user_id FROM matchmaking_queue WHERE user_id = $1', [req.user.id]);
    res.json({ status: queued ? 'waiting' : 'idle' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error revisando matchmaking' });
  }
});

app.delete('/api/matchmaking/leave', auth, async (req, res) => {
  try {
    await run('DELETE FROM matchmaking_queue WHERE user_id = $1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saliendo de cola' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Horse Racing Legend API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo inicializar PostgreSQL:', err);
    process.exit(1);
  });
