import pool from '../db.js';

export function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

export async function requireAdmin(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);

  if (!rows[0]?.is_admin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
