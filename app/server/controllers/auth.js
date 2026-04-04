import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sendEmail } from '../email.js';
import { generateCaptcha, verifyCaptcha } from '../captcha.js';
import { createSession, destroySession, regenerateSession } from '../middleware/session.js';
import * as authQueries from '../queries/auth.js';
import * as userQueries from '../queries/users.js';

// pre-computed hash so we can run bcrypt.compare even when user doesn't exist — prevents timing-based account enumeration
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
    return res.status(400).json({ error: 'Incorrect captcha, try again' });
  }

  const hashed = await bcrypt.hash(password + process.env.PEPPER, 12);

  try {
    await authQueries.createUser(username, email, hashed);
  } catch (err) {
    // unique constraint violation — don't reveal which field
    if (err.code === '23505') {
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
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // admin accounts require 2FA, regular users log in directly
  if (user.is_admin) {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await authQueries.setEmailCode(user.id, code, expiresAt);
    await sendEmail(email, 'Your SoundAdvice login code', `Your code is: ${code}`);

    await createSession(res, user.id, true);
    return res.json({ message: '2FA code sent', redirect: '/sign-in/2fa' });
  }

  await createSession(res, user.id, false);
  res.json({ message: 'Login successful', redirect: '/' });
};

export const verify2fa = async (req, res) => {
  const { code } = req.body;

  if (!req.pendingUserId) {
    return res.status(401).json({ error: 'Please log in first' });
  }

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const user = await authQueries.getEmailCode(req.pendingUserId);

  if (!user || !user.email_code) {
    return res.status(401).json({ error: 'Please log in first' });
  }

  // check expiry
  if (new Date() > new Date(user.email_code_expires)) {
    await destroySession(req, res);
    await authQueries.clearEmailCode(req.pendingUserId);
    return res.status(401).json({ error: 'Code expired, please log in again' });
  }

  // timing-safe comparison
  const codeBuffer = Buffer.from(code.toString().padEnd(6));
  const storedBuffer = Buffer.from(user.email_code.padEnd(6));
  const match = crypto.timingSafeEqual(codeBuffer, storedBuffer);

  if (!match) {
    // TODO: increment two_factor_attempts and lock out after 3-5 failures
    return res.status(401).json({ error: 'Invalid code' });
  }

  // 2FA passed — regenerate session to prevent fixation
  await authQueries.clearEmailCode(req.pendingUserId);
  await regenerateSession(req, res, req.pendingUserId);

  res.json({ message: 'Login successful', redirect: '/' });
};

export const logout = async (req, res) => {
  await destroySession(req, res);
  res.json({ message: 'Logged out', redirect: '/sign-in' });
};

export const me = async (req, res) => {
  if (!req.userId) {
    return res.json({ user: null });
  }

  const user = await userQueries.findById(req.userId);
  res.json({ user: user || null });
};
