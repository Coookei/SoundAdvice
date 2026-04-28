import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateCaptcha, verifyCaptcha } from '../lib/captcha.js';
import { hashCode } from '../lib/crypto.js';
import { sendEmail } from '../lib/email.js';
import { logAuthEvent } from '../lib/log.js';
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
    const codeHash = hashCode(code); // hash with HMAC and 2FA secret stored in .env. attacker unable to get 2fa code even if db compromised

    await authQueries.setEmailCode(user.id, codeHash, expiresAt);
    await sendEmail(email, 'Your SoundAdvice login code', `Your code is: ${code}. It expires in 10 minutes.`);

    // if user starts 2fa flow but then doesnt complete,  and then logs in again in diff browser, without the previous cookie,
    // then the old 2fa pending sesion will be there and then can be locked out by the 2fa attempts limit from previous session, so always CLEAR previous pending sessoins.
    await sessionQueries.deletePendingSessionsByUserId(user.id);

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
  const submittedHash = hashCode(code.toString());
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

// forgot password step 1: email a code if the account exists, but always respond the same
// way (prevents account enumeration via the reset form)
export const forgotRequest = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await authQueries.findByEmail(email);

  if (user) {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await authQueries.setEmailCode(user.id, hashCode(code), expiresAt);
    await sendEmail(email, 'SoundAdvice password reset code', `Your code is: ${code}. It expires in 10 minutes.`);
    await logAuthEvent('forgot_requested', { userId: user.id, ip: req.ip });
  } else {
    await logAuthEvent('forgot_unknown_email', { ip: req.ip });
  }

  res.json({ message: 'If that email is registered, a code has been sent.' });
};

// step 2: verify the code and issue a short-lived reset token. this token proves the user
// passed the email check, so the reset endpoint can trust them without another session
export const forgotVerify = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const user = await authQueries.findByEmail(email);
  const stored = user ? await authQueries.getEmailCode(user.id) : null;

  if (!user || !stored?.email_code || new Date() > new Date(stored.email_code_expires)) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const submitted = Buffer.from(hashCode(code.toString()), 'hex');
  const storedBuf = Buffer.from(stored.email_code, 'hex');
  if (submitted.length !== storedBuf.length || !crypto.timingSafeEqual(submitted, storedBuf)) {
    await logAuthEvent('forgot_bad_code', { userId: user.id, ip: req.ip });
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await authQueries.setResetToken(user.id, token, expiresAt);
  await authQueries.clearEmailCode(user.id);

  res.json({ token });
};

// step 3: apply the new password and wipe every session so any attacker is kicked out
export const forgotReset = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }

  const user = await authQueries.findByResetToken(token);
  if (!user || new Date() > new Date(user.password_reset_expires)) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }

  const hashed = await bcrypt.hash(newPassword + process.env.PEPPER, 12);
  await authQueries.updatePassword(user.id, hashed);
  await authQueries.clearResetToken(user.id);
  await sessionQueries.deleteAllSessionsByUserId(user.id);
  await logAuthEvent('forgot_reset', { userId: user.id, ip: req.ip });

  res.json({ message: 'Password updated', redirect: '/sign-in' });
};
