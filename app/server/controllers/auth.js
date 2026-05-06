import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateCaptcha, verifyCaptcha } from '../lib/captcha.js';
import { hashCode } from '../lib/crypto.js';
import { sendEmail } from '../lib/email.js';
import { recordEvent, AuditEvent } from '../lib/audit.js';
import { generateCSRFToken } from '../middleware/csrf.js';
import { createSession, destroySession, regenerateSession } from '../middleware/session.js';
import * as authQueries from '../queries/auth.js';
import * as sessionQueries from '../queries/sessions.js';
import * as userQueries from '../queries/users.js';
import {
  validate,
  requireEmail,
  requirePassword,
  requireUsername,
  requireDigitCode,
  requireString,
} from '../lib/validate.js';

// pre computed hash so we can run bcrypt.compare even when user doesnt exist. this prevents timing based account enumeration
const FAKE_HASH = await bcrypt.hash('fake-password-for-timing' + process.env.PEPPER, 12);

export const getCaptcha = (_req, res) => {
  const { token, scrambled } = generateCaptcha();
  res.json({ token, scrambled });
};

export const register = async (req, res) => {
  // apply server side validation
  const check = validate(() => ({
    username: requireUsername(req.body.username),
    email: requireEmail(req.body.email),
    password: requirePassword(req.body.password),
    captchaToken: requireString(req.body.captchaToken, 'Captcha token', { min: 1, max: 100, trim: true }),
    captchaAnswer: requireString(req.body.captchaAnswer, 'Captcha answer', { min: 1, max: 20, trim: true }),
  }));
  if (!check.ok) {
    // if any data is malformed, give error message back to user
    return res.status(400).json({ error: check.error });
  }

  const { username, email, password, captchaToken, captchaAnswer } = check.value; // we have cleaned and validated input here

  if (!verifyCaptcha(captchaToken, captchaAnswer)) {
    await recordEvent(req, AuditEvent.REGISTER_CAPTCHA_FAIL);
    return res.status(400).json({ error: 'Incorrect captcha, try again' });
  }

  // record start time so that we can ensure registration attempts will always take at least 1 second,
  // this is to prevent timings based account enumeration from differences in database and logging times
  const startedAt = Date.now();
  const minimumDelayMs = 1000; // 1 second

  // hash password with shared pepper, bcrypt generates unique salt
  // for each password hash with cost factor 12
  const hashed = await bcrypt.hash(password + process.env.PEPPER, 12);

  try {
    const newUser = await authQueries.createUser(username, email, hashed);
    await recordEvent(req, AuditEvent.REGISTER, { actorId: newUser.id });
  } catch (err) {
    // prevents account enumeration by ALWAYS returning same success message
    // whether actual registration success or duplicate username/email error (Postgres error 23505, unique constraint violation).
    if (err.code === '23505') {
      await recordEvent(req, AuditEvent.REGISTER_DUPLICATE, {
        detail: err.constraint?.includes('email') ? 'email' : 'username',
      });

      await waitUntilMinimum(startedAt, minimumDelayMs); // ensure registration always takes at least 1 second to prevent timings based account enumeration
      return res.json({ message: 'Registration successful' }); // always response same message to prevent account enumeration
    }
    throw err;
  }

  await waitUntilMinimum(startedAt, minimumDelayMs); // ensure registration always takes at least 1 second to prevent timings based account enumeration
  res.json({ message: 'Registration successful' }); // always response same message to prevent account enumeration
};

export const login = async (req, res) => {
  const check = validate(() => ({
    email: requireEmail(req.body.email),
    password: requirePassword(req.body.password),
  }));
  if (!check.ok) {
    // single generic message to avoid leaking which field was malformed
    return res.status(400).json({ error: 'Invalid email or password' });
  }

  const { email, password } = check.value;

  const user = await authQueries.findByEmail(email);

  // always run bcrypt compare to prevent timing attacks
  const valid = user
    ? await bcrypt.compare(password + process.env.PEPPER, user.password)
    : await bcrypt.compare(password + process.env.PEPPER, FAKE_HASH);

  if (!user || !valid) {
    await recordEvent(req, AuditEvent.LOGIN_FAIL, { detail: user ? 'wrong password' : 'unknown email' });
    return res.status(401).json({ error: 'Invalid email or password' }); // generic message to prevent account enumeration
  }

  // by this point we have a valid user and correct password, so the bycrypt compare is enough to prevent timing based account enumeration

  // admin accounts require 2FA, regular users log in directly
  if (user.is_admin) {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    const codeHash = hashCode(code); // hash with HMAC and 2FA secret stored in .env. attacker unable to get 2fa code even if db compromised

    await authQueries.setEmailCode(user.id, codeHash, expiresAt);

    // we have already checked the users credentials at this point, so the account cant be enumerated as user has basically logged in
    // so we can await the email send, as the delay does not matter
    await sendEmail(email, 'Your SoundAdvice login code', `Your code is: ${code}. It expires in 10 minutes.`);

    // if user starts 2fa flow but then doesnt complete,  and then logs in again in diff browser, without the previous cookie,
    // then the old 2fa pending sesion will be there and then can be locked out by the 2fa attempts limit from previous session, so always CLEAR previous pending sessoins.
    await sessionQueries.deletePendingSessionsByUserId(user.id);

    await createSession(res, user.id, true, true); // true for pending session, true as admin
    await recordEvent(req, AuditEvent.LOGIN_2FA_PENDING, { actorId: user.id });
    return res.json({ message: '2FA code sent', redirect: '/sign-in/2fa' });
  }

  await createSession(res, user.id, false, false); // user session, false for no 2fa pending, false for not admin
  await recordEvent(req, AuditEvent.LOGIN_SUCCESS, { actorId: user.id });
  res.json({ message: 'Login successful', redirect: '/' });
};

export const verify2fa = async (req, res) => {
  const check = validate(() => requireDigitCode(req.body.code, 6));
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const code = check.value;

  const user = await authQueries.getEmailCode(req.pendingUserId);

  if (!user || !user.email_code) {
    await recordEvent(req, AuditEvent.TWOFA_FAIL, { actorId: req.pendingUserId, detail: 'no pending code' });
    return res.status(401).json({ error: 'Please log in first' });
  }

  // check expiry
  if (new Date() > new Date(user.email_code_expires)) {
    await destroySession(req, res);
    await authQueries.clearEmailCode(req.pendingUserId);
    await recordEvent(req, AuditEvent.TWOFA_EXPIRED, { actorId: req.pendingUserId });
    return res.status(401).json({ error: 'Code expired, please log in again' });
  }

  // timing safe comparison of HMAC hashes
  const submittedHash = hashCode(code);
  const submittedBuffer = Buffer.from(submittedHash, 'hex');
  const storedBuffer = Buffer.from(user.email_code, 'hex');
  const match = submittedBuffer.length === storedBuffer.length && crypto.timingSafeEqual(submittedBuffer, storedBuffer);

  if (!match) {
    const row = await sessionQueries.increment2faAttempts(req.pendingUserId);

    if (row?.two_factor_attempts >= 3) {
      await destroySession(req, res);
      await authQueries.clearEmailCode(req.pendingUserId);
      await recordEvent(req, AuditEvent.TWOFA_LOCKOUT, { actorId: req.pendingUserId });
      return res.status(401).json({ error: 'Too many attempts, please log in again' });
    }

    await recordEvent(req, AuditEvent.TWOFA_FAIL, { actorId: req.pendingUserId, detail: 'invalid code' });
    return res.status(401).json({ error: 'Invalid code' });
  }

  // 2FA passed, regenerate session to prevent fixation
  await authQueries.clearEmailCode(req.pendingUserId);
  await regenerateSession(req, res, req.pendingUserId, true); // true as admin to get shorter session
  await recordEvent(req, AuditEvent.TWOFA_SUCCESS, { actorId: req.pendingUserId });

  res.json({ message: 'Login successful', redirect: '/' });
};

export const logout = async (req, res) => {
  const userId = req.userId;
  await destroySession(req, res);
  await recordEvent(req, AuditEvent.LOGOUT, { actorId: userId });
  res.json({ message: 'Logged out', redirect: '/sign-in' });
};

export const me = async (req, res) => {
  if (!req.userId) {
    return res.json({ user: null, csrfToken: null });
  }

  const user = await userQueries.findById(req.userId);

  // explicitly mark response as same origin, so cross origin scripts cannot read the response, this keeps the csrf token only readable by a user using our website directly
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  // csrf token is derived from the sid so it invalidates whenever the session expires
  res.json({ user: user || null, csrfToken: generateCSRFToken(req.sid) });
};

// forgot password step 1: email a code if the account exists, but always respond the same
// way (prevents account enumeration via the reset form)
export const forgotRequest = async (req, res) => {
  const check = validate(() => requireEmail(req.body.email));
  if (!check.ok) {
    // always respond the same way regardless of failure to avoid account enumeration
    return res.json({ message: 'If that email is registered, a code has been sent.' });
  }

  const email = check.value;

  const startedAt = Date.now(); // record start time to prevent timing based account enumeration
  const minimumDelayMs = 1000; // 1 second

  const user = await authQueries.findByEmail(email);

  if (user) {
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await authQueries.setEmailCode(user.id, hashCode(code), expiresAt);

    // DO NOT await the email, as otherwise the delay could be used to enumerate accounts
    sendEmail(email, 'SoundAdvice password reset code', `Your code is: ${code}. It expires in 10 minutes.`).catch(
      (err) => {
        console.error('Failed to send password reset email:', err);
      }
    );

    await recordEvent(req, AuditEvent.FORGOT_REQUESTED, { actorId: user.id });
  } else {
    await recordEvent(req, AuditEvent.FORGOT_UNKNOWN_EMAIL);
  }

  await waitUntilMinimum(startedAt, minimumDelayMs); // wait a minimum time to prevent timing based account enumeration
  res.json({ message: 'If that email is registered, a code has been sent.' }); // always respond same way to prevent account enumeration
};

// step 2: verify the code and issue a short-lived reset token. this token proves the user
// passed the email check, so the reset endpoint can trust them without another session
export const forgotVerify = async (req, res) => {
  const check = validate(() => ({
    email: requireEmail(req.body.email),
    code: requireDigitCode(req.body.code, 6),
  }));
  if (!check.ok) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const { email, code } = check.value;

  const startedAt = Date.now(); // record start time to prevent timings based account enumeration
  const minimumDelayMs = 1000; // 1 second

  const user = await authQueries.findByEmail(email);
  const stored = user ? await authQueries.getEmailCode(user.id) : null;

  if (!user || !stored?.email_code || new Date() > new Date(stored.email_code_expires)) {
    await waitUntilMinimum(startedAt, minimumDelayMs); // unknown email + random code, same response timings
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const submitted = Buffer.from(hashCode(code), 'hex');
  const storedBuf = Buffer.from(stored.email_code, 'hex');

  if (submitted.length !== storedBuf.length || !crypto.timingSafeEqual(submitted, storedBuf)) {
    await recordEvent(req, AuditEvent.FORGOT_BAD_CODE, { actorId: user.id });
    await waitUntilMinimum(startedAt, minimumDelayMs); // known email + random code, same response timings
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await authQueries.setResetToken(user.id, token, expiresAt);
  await authQueries.clearEmailCode(user.id);

  // user gave correct email + correct code, so account existence is not secret, so no need to delay response.
  res.json({ token });
};

// step 3: apply the new password and wipe every session so any attacker is kicked out
export const forgotReset = async (req, res) => {
  // reset token is crypto.randomBytes(32).toString('hex') so always 64 hex chars
  const check = validate(() => ({
    token: requireString(req.body.token, 'Token', { min: 64, max: 64 }),
    newPassword: requirePassword(req.body.newPassword),
  }));
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const { token, newPassword } = check.value;

  const user = await authQueries.findByResetToken(token);
  if (!user || new Date() > new Date(user.password_reset_expires)) {
    return res.status(400).json({ error: 'Invalid or expired reset link' });
  }

  const hashed = await bcrypt.hash(newPassword + process.env.PEPPER, 12);
  await authQueries.updatePassword(user.id, hashed);
  await authQueries.clearResetToken(user.id);
  await sessionQueries.deleteAllSessionsByUserId(user.id);
  await recordEvent(req, AuditEvent.FORGOT_RESET, { actorId: user.id });

  res.json({ message: 'Password updated', redirect: '/sign-in' });
};

// magic link step 1: email a code if account exists, but always give same response to prevent account enumeration
export const magicLinkRequest = async (req, res) => {
  const check = validate(() => requireEmail(req.body.email));
  if (!check.ok) {
    return res.json({ message: 'If that account exists, a sign-in link has been sent.' });
  }

  const email = check.value;

  const startedAt = Date.now(); // record start time to prevent timing based account enumeration
  const minimumDelayMs = 1000; // 1 second

  const user = await authQueries.findByEmail(email);

  if (user?.is_admin) {
    // admins are not allowed to use magic link logic as it prevents a 2FA based flow where a password and email code are required.

    // DO NOT await the email, as otherwise the delay could be used to enumerate accounts
    sendEmail(
      email,
      'SoundAdvice sign-in method unavailable',
      `This account cannot use magic-link sign in. Please sign in with your password and 2FA verification code instead.`
    ).catch((err) => {
      console.error('Failed to send magic link email:', err);
    });

    await recordEvent(req, AuditEvent.MAGIC_LINK_ADMIN_BLOCKED, { actorId: user.id });
  } else if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashCode(token);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await authQueries.setMagicLinkToken(user.id, tokenHash, expiresAt);

    // do not generate login link using the req object as could be manipualted, instead we use a BASE_URL env variable
    const link = `${process.env.BASE_URL}/sign-in/magic-link/confirm?token=${token}`;

    // DO NOT await the email, as otherwise the delay could be used to enumerate accounts
    sendEmail(
      email,
      'Your SoundAdvice sign-in link',
      `Click to sign in: ${link}\n\nThis link expires in 10 minutes.`
    ).catch((err) => {
      console.error('Failed to send magic link email:', err);
    });

    await recordEvent(req, AuditEvent.MAGIC_LINK_REQUEST, { actorId: user.id });
  } else {
    await recordEvent(req, AuditEvent.MAGIC_LINK_UNKNOWN_EMAIL);
  }

  await waitUntilMinimum(startedAt, minimumDelayMs); // wait a minimum time to prevent timing based account enumeration
  res.json({ message: 'If that account exists, a sign-in link has been sent.' }); // always respond the same way to prevent account enumeration
};

// step 2: user clicks link in email which takes them to a confirm page. They click confirm
// which POSTS the token here. If token valid we create session for them.
// admins cannot use magic logic since admins must use the 2FA route of password + email code
export const magicLinkVerify = async (req, res) => {
  // token made with crypto.randomBytes(32).toString('hex') which means is always 64 hex chars
  const check = validate(() => requireString(req.body.token, 'Token', { min: 64, max: 64 }));
  if (!check.ok) {
    return res.status(400).json({ error: 'Invalid or expired link' });
  }

  const token = check.value;
  const tokenHash = hashCode(token);

  // this will find and clear matching valid token. If expired will not return anything, so no need to check token expiry here.
  const user = await authQueries.consumeMagicLinkToken(tokenHash);
  if (!user) {
    // no matching token, or token expired
    return res.status(400).json({ error: 'Invalid or expired link' });
  }

  if (user.is_admin) {
    // admin should never have a magic link token set, as they are not allowed to use this single factor login method
    // but just as backup, BLOCK admins just in case
    await recordEvent(req, AuditEvent.MAGIC_LINK_ADMIN_VERIFY_BLOCKED, { actorId: user.id });
    return res.status(400).json({ error: 'Invalid or expired link' });
  }

  await createSession(res, user.id, false, false);
  await recordEvent(req, AuditEvent.MAGIC_LINK_LOGIN, { actorId: user.id });

  res.json({ message: 'Signed in', redirect: '/' });
};

// helper function used to prevent timing based account enumeration,
// to always make response times take a minimum amount of time
const waitUntilMinimum = async (startedAt, minimumMs) => {
  const duration = Date.now() - startedAt; // calculate how much time passed since request started
  const remaining = minimumMs - duration; // calculate how long to wait until we reach min response time

  // if we already passed the minimum time, return now
  if (remaining <= 0) {
    return;
  }

  // this simply creates a promise that waits for the remaining time before resolving
  // and we wait for it here, as it is awaited
  await new Promise((resolve) => setTimeout(resolve, remaining));
};
