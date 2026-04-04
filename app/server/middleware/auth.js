import pool from '../db.js';

// used to protect API routes
export function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

// used to protect pages by redirecting to sign in
export function requireAuthPage(req, res, next) {
  if (!req.userId) {
    return res.redirect('/sign-in');
  }
  next();
}

// protects admin API routes
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

// protects admin pages
export async function requireAdminPage(req, res, next) {
  if (!req.userId) {
    return res.redirect('/sign-in');
  }
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);

  if (!rows[0]?.is_admin) {
    return res.redirect('/'); // send to homepage if not admin
  }
  next();
}
