import pool from '../db.js';

// protects guest only API endpoints e.g signin/up
export function requireGuest(req, res, next) {
  if (req.userId) {
    return res.status(400).json({ error: 'Already logged in' });
  }
  if (req.pendingUserId) {
    return res.status(400).json({ error: 'Complete 2FA to continue' });
  }
  next();
}

// protects 2FA API endpoint to need user in pending flow
export function requirePending(req, res, next) {
  if (!req.pendingUserId) {
    return res.status(401).json({ error: 'Please log in first' });
  }
  next();
}

// used for any user session (full or pending), protects the logout API endpoint
export function requireSession(req, res, next) {
  if (!req.userId && !req.pendingUserId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

// used to protect authenticated API routes
export function requireAuth(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Not logged in' });
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
