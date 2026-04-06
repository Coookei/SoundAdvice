import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateCaptcha, verifyCaptcha } from '../captcha.js';
import { sendEmail } from '../email.js';
import { logAuthEvent } from '../log.js';
import { createSession, destroySession, regenerateSession } from '../middleware/session.js';
import * as authQueries from '../queries/auth.js';
import * as sessionQueries from '../queries/sessions.js';
import * as userQueries from '../queries/users.js';

// pre computed hash so we can run bcrypt.compare even when user doesn't exist - prevents timing-based account enumeration
const FAKE_HASH = await bcrypt.hash('fake-password-for-timing', 12);

export const getCaptcha = (_req, res) => {
  const { token, scrambled } = generateCaptcha();
  res.json({ token, scrambled });
};

export const register = async (req, res) => {
  const { username, email, password, captchaToken, captchaAnswer } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!verifyCaptcha(captchaToken, captchaAnswer || '')) {
    await logAuthEvent('register_captcha_fail', { ip: req.ip });
    return res.status(400).json({ error: 'Incorrect captcha, try again' });
  }

  // hash password with shared pepper, bcrypt generates unique salt
  // for each password hash with cost factor 12
  const hashed = await bcrypt.hash(password + process.env.PEPPER, 12);

  try {
    const newUser = await authQueries.createUser(username, email, hashed);
    await logAuthEvent('register', { userId: newUser.id, ip: req.ip });
  } catch (err) {
    // prevents account enumeration by ALWAYS returning same success message
    // whether actual registration success or duplicate username/email error (Postgres error 23505, unique constraint violation).
    if (err.code === '23505') {
      await logAuthEvent('register_duplicate', { ip: req.ip });
      return res.json({ message: 'Registration successful' });
    }
    throw err;
  }

  res.json({ message: 'Registration successful' });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await authQueries.findByEmail(email);

  // always run bcrypt compare to prevent timing attacks
  const valid = user
    ? await bcrypt.compare(password + process.env.PEPPER, user.password)
    : await bcrypt.compare(password, FAKE_HASH);

  if (!user || !valid) {
    await logAuthEvent('login_fail', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // admin accounts require 2FA, regular users log in directly
  if (user.is_admin) {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    const codeHash = hmacHash(code); // hash with HMAC and 2FA secret stored in .env. attacker unable to get 2fa code even if db compromised

    await authQueries.setEmailCode(user.id, codeHash, expiresAt);
    await sendEmail(email, 'Your SoundAdvice login code', `Your code is: ${code}. It expires in 10 minutes.`);

    await createSession(res, user.id, true, true); // true for pending session, true as admin
    await logAuthEvent('login_2fa_pending', { userId: user.id, ip: req.ip });
    return res.json({ message: '2FA code sent', redirect: '/sign-in/2fa' });
  }

  await createSession(res, user.id, false, false); // user session, false for no 2fa pending, false for not admin
  await logAuthEvent('login_success', { userId: user.id, ip: req.ip });
  res.json({ message: 'Login successful', redirect: '/' });
};

export const verify2fa = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const user = await authQueries.getEmailCode(req.pendingUserId);

  if (!user || !user.email_code) {
    await logAuthEvent('2fa_fail', { userId: req.pendingUserId, ip: req.ip, detail: 'no pending code' });
    return res.status(401).json({ error: 'Please log in first' });
  }

  // check expiry
  if (new Date() > new Date(user.email_code_expires)) {
    await destroySession(req, res);
    await authQueries.clearEmailCode(req.pendingUserId);
    await logAuthEvent('2fa_expired', { userId: req.pendingUserId, ip: req.ip });
    return res.status(401).json({ error: 'Code expired, please log in again' });
  }

  // timing safe comparison of HMAC hashes
  const submittedHash = hmacHash(code.toString());
  const submittedBuffer = Buffer.from(submittedHash, 'hex');
  const storedBuffer = Buffer.from(user.email_code, 'hex');
  const match = crypto.timingSafeEqual(submittedBuffer, storedBuffer);

  if (!match) {
    const row = await sessionQueries.increment2faAttempts(req.pendingUserId);

    if (row?.two_factor_attempts >= 3) {
      await destroySession(req, res);
      await authQueries.clearEmailCode(req.pendingUserId);
      await logAuthEvent('2fa_lockout', { userId: req.pendingUserId, ip: req.ip });
      return res.status(401).json({ error: 'Too many attempts, please log in again' });
    }

    await logAuthEvent('2fa_fail', { userId: req.pendingUserId, ip: req.ip, detail: 'invalid code' });
    return res.status(401).json({ error: 'Invalid code' });
  }

  // 2FA passed, regenerate session to prevent fixation
  await authQueries.clearEmailCode(req.pendingUserId);
  await regenerateSession(req, res, req.pendingUserId, true); // true as admin to get shorter session
  await logAuthEvent('2fa_success', { userId: req.pendingUserId, ip: req.ip });

  res.json({ message: 'Login successful', redirect: '/' });
};

export const logout = async (req, res) => {
  const userId = req.userId;
  await destroySession(req, res);
  await logAuthEvent('logout', { userId, ip: req.ip });
  res.json({ message: 'Logged out', redirect: '/sign-in' });
};

export const me = async (req, res) => {
  if (!req.userId) {
    return res.json({ user: null });
  }

  const user = await userQueries.findById(req.userId);
  res.json({ user: user || null });
};

function hmacHash(value) {
  return crypto.createHmac('sha256', process.env['2FA_SECRET']).update(value).digest('hex');
}
