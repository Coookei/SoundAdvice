import pool from '../db.js';

// redirects unauthenticated users to sign in
export function redirectIfGuest(req, res, next) {
  if (!req.userId) {
    if (req.pendingUserId) {
      return res.redirect('/sign-in/2fa');
    }
    return res.redirect('/sign-in');
  }
  next();
}

// redirects authenticated users away from guest pages e.g. sign in/up
export function redirectIfAuthed(req, res, next) {
  if (req.userId) {
    return res.redirect('/');
  }
  if (req.pendingUserId) {
    return res.redirect('/sign-in/2fa');
  }
  next();
}

// redirects users not in a pending 2FA session away from the 2FA page
export function redirectIfNotPending(req, res, next) {
  if (req.userId) {
    return res.redirect('/');
  }
  if (!req.pendingUserId) {
    return res.redirect('/sign-in');
  }
  next();
}

// redirects if not admin away from admin pages
export async function redirectIfNotAdmin(req, res, next) {
  if (!req.userId) {
    if (req.pendingUserId) {
      return res.redirect('/sign-in/2fa');
    }
    return res.redirect('/sign-in');
  }
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.userId]);

  if (!rows[0]?.is_admin) {
    return res.redirect('/'); // send to homepage if not admin
  }
  next();
}
