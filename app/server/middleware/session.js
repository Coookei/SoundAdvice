import crypto from 'crypto';
import * as sessionQueries from '../queries/sessions.js';

const isProduction = process.env.NODE_ENV === 'production';

// parse the sid cookie from the raw cookie header
function parseSid(req) {
  if (!req.headers.cookie) return null;
  const match = req.headers.cookie.split('; ').find((c) => c.startsWith('sid='));
  return match ? match.split('=')[1] : null;
}

function setSidCookie(res, sid, maxAge) {
  // Use Secure cookies in production to ensure the cookie is only sent over HTTPS
  // HttpOnly prevents javascript on page reading so prevents XSS stealing cookies
  // SameSite=Strict prevents CSRF
  // Path=/ makes available on all routes
  // Max-Age sets expiry
  res.setHeader(
    'Set-Cookie',
    `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(maxAge / 1000)}${isProduction ? '; Secure' : ''}`
  );
}

function clearSidCookie(res) {
  res.setHeader('Set-Cookie', `sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${isProduction ? '; Secure' : ''}`);
}

const ADMIN_MAX_AGE = 24 * 60 * 60 * 1000; // admins only have 1 day session
const USER_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // users session last 7 days
const PENDING_MAX_AGE = 10 * 60 * 1000; // 2FA flow lasts 10 minutes

// runs on every request to look up session and attaches userId or pendingUserId
export async function sessionMiddleware(req, res, next) {
  req.userId = null;
  req.pendingUserId = null;
  req.sid = null;

  const sid = parseSid(req);
  if (!sid) return next();

  const session = await sessionQueries.findSessionBySid(sid);

  if (!session) {
    clearSidCookie(res);
    return next();
  }

  // expired so delete it and clear cookie
  if (new Date() > new Date(session.expires_at)) {
    await sessionQueries.deleteSessionBySid(sid);
    clearSidCookie(res);
    return next();
  }

  req.sid = sid;
  if (session.pending) {
    req.pendingUserId = session.user_id;
  } else {
    req.userId = session.user_id;
  }

  next();
}

// called after 2FA success and creates  full session
// pending = true, session is only for holding userId until 2FA is completed
// isAdmin = true, session is for admin user and should have shorter expiry
export async function createSession(res, userId, pending = false, isAdmin = false) {
  // the sid cant be guessed as massive size so no need to sign it
  const sid = crypto.randomBytes(32).toString('hex');
  const maxAge = pending ? PENDING_MAX_AGE : isAdmin ? ADMIN_MAX_AGE : USER_MAX_AGE;
  const expiresAt = new Date(Date.now() + maxAge);

  await sessionQueries.insertSession(sid, userId, pending, expiresAt);

  setSidCookie(res, sid, maxAge);
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

// called after 2FA to destroy old session and create a new one to prevent fixation
export async function regenerateSession(req, res, userId, isAdmin = false) {
  await destroySession(req, res);
  return createSession(res, userId, false, isAdmin);
}
