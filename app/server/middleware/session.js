import crypto from 'crypto';
import * as sessionQueries from '../queries/sessions.js';

// parse the sid cookie from the raw cookie header
function parseSid(req) {
  if (!req.headers.cookie) return null;
  const match = req.headers.cookie.split('; ').find((c) => c.startsWith('sid='));
  return match ? match.split('=')[1] : null;
}

function setSidCookie(res, sid, maxAge) {
  // HttpOnly prevents javascript on page reading so prevents XSS stealing cookies
  // SameSite=Strict prevents CSRF
  // Path=/ makes it available on all routes
  // Max-Age sets expiry
  // TODO in production add 'Secure;' to cookies to only send cookies over HTTPS
  res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(maxAge / 1000)}`);
}

function clearSidCookie(res) {
  res.setHeader('Set-Cookie', `sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
}

const SESSION_MAX_AGE = 30 * 60 * 1000;

// runs on every request — looks up session and attaches userId or pendingUserId
export async function sessionMiddleware(req, res, next) {
  req.userId = null;
  req.pendingUserId = null;

  const sid = parseSid(req);
  if (!sid) return next();

  const session = await sessionQueries.findSessionBySid(sid);

  if (!session) {
    clearSidCookie(res);
    return next();
  }

  // expired — delete it and clear cookie
  if (new Date() > new Date(session.expires_at)) {
    await sessionQueries.deleteSessionBySid(sid);
    clearSidCookie(res);
    return next();
  }

  if (session.pending) {
    req.pendingUserId = session.user_id;
  } else {
    req.userId = session.user_id;
  }

  next();
}

// called after 2FA success — creates  full session
export async function createSession(res, userId, pending = false) {
  // the sid cant be guessed as massive size so no need to sign it
  const sid = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE);

  await sessionQueries.insertSession(sid, userId, pending, expiresAt);

  setSidCookie(res, sid, SESSION_MAX_AGE);
  return sid;
}

//logout
export async function destroySession(req, res) {
  const sid = parseSid(req);
  if (sid) {
    await sessionQueries.deleteSessionBySid(sid);
  }
  clearSidCookie(res);
}

// called after 2FA — destroy old session and create a new one to prevent fixation
export async function regenerateSession(req, res, userId) {
  await destroySession(req, res);
  return createSession(res, userId, false);
}
