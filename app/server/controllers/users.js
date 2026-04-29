import crypto from 'crypto';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import pool from '../db.js';
import { decrypt, hashCode } from '../lib/crypto.js';
import { sendEmail } from '../lib/email.js';
import { parseFileUpload } from '../lib/upload.js';
import * as authQueries from '../queries/auth.js';
import * as sessionQueries from '../queries/sessions.js';
import * as userQueries from '../queries/users.js';
import { type } from 'os';

// validate pfp uploads
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// file upload size limit
const limits = {
  png: 2 * 1024 * 1024, // 2MB upload
};

// detects file type using magic bytes
function detectFileType(buffer) {
  // ensures input is valid buffer
  if (!Buffer.isBuffer(buffer)) {
    return null;
  }

  // check first 8 bytes of file against png signature
  const isPNG = buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG);

  // return null if not png
  return isPNG ? 'png' : null;
}

// va.idate upload
function validateUpload(fileBuffer) {
  // ensure input is binary data
  if (!Buffer.isBuffer(fileBuffer)) {
    return null;
  }

  // detect actual file type
  const type = detectFileType(fileBuffer);

  // reject if unsuported
  if (!type) {
    return null;
  }

  // enforce size linmits - prevents DDoS attacks
  if (fileBuffer.length > limits[type]) {
    return null;
  }

  // return safe file type
  return type;
}

// hold the new password hash in memory until the email code is verified - avoids adding a DB column for a short-lived value
const pendingChanges = new Map();

setInterval(
  () => {
    const now = Date.now();
    for (const [userId, entry] of pendingChanges) {
      if (now > entry.expiresAt) pendingChanges.delete(userId);
    }
  },
  10 * 60 * 1000
).unref();

// gets all users
export const getUsers = async (req, res) => {
  const users = await userQueries.findAll();

  // bios as plain text
  for (const user of users) {
    user.bio = user.bio || '';
  }

  res.json({ users });
};

// get user by their profile ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  const user = await userQueries.findById(id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  user.bio = user.bio || '';

  res.json({ user });
};

// update bio
export const updateBio = async (req, res) => {
  let { bio } = req.body;

  if (typeof bio !== 'string') {
    return res.status(400).json({ error: 'Invalid bio type' });
  }

  bio = bio.trim();

  // update bio of currently logged in user - only currently logged in user can do this to their own bio
  // uses an array - bio = $1, userId = $2
  // prevents SQL injection - actual values not visible in database due to being passed into a separate array
  await pool.query('UPDATE users SET bio = $1 WHERE id = $2', [bio, req.userId]);

  res.json({ success: true });
};

// step 1 of password change: verify current password, email a code, stash new hash
export const requestPasswordChange = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  const { rows } = await pool.query('SELECT password, email_encrypted FROM users WHERE id = $1', [req.userId]);
  const user = rows[0];
  const valid = await bcrypt.compare(currentPassword + process.env.PEPPER, user.password);
  if (!valid) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  // hash the new password now so plaintext isn't held in memory while waiting for the code
  const newHash = await bcrypt.hash(newPassword + process.env.PEPPER, 12);

  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await authQueries.setEmailCode(req.userId, hashCode(code), expiresAt);

  pendingChanges.set(req.userId, { newHash, expiresAt: Date.now() + 10 * 60 * 1000 });

  const email = decrypt(user.email_encrypted);
  await sendEmail(email, 'SoundAdvice password change code', `Your code is: ${code}. It expires in 10 minutes.`);

  res.json({ message: 'Code sent' });
};

// step 2: verify code, apply new password, invalidate every other session for this user
export const confirmPasswordChange = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  const pending = pendingChanges.get(req.userId);
  const stored = await authQueries.getEmailCode(req.userId);

  if (!pending || !stored?.email_code || new Date() > new Date(stored.email_code_expires)) {
    pendingChanges.delete(req.userId);
    await authQueries.clearEmailCode(req.userId);
    return res.status(400).json({ error: 'Code expired, please try again' });
  }

  const submitted = Buffer.from(hashCode(code.toString()), 'hex');
  const storedBuf = Buffer.from(stored.email_code, 'hex');
  if (submitted.length !== storedBuf.length || !crypto.timingSafeEqual(submitted, storedBuf)) {
    return res.status(400).json({ error: 'Invalid code' });
  }

  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [pending.newHash, req.userId]);
  await authQueries.clearEmailCode(req.userId);
  pendingChanges.delete(req.userId);

  // if an attacker had a stolen cookie, they're now logged out; keep current session alive
  await sessionQueries.deleteOtherSessionsByUserId(req.userId, req.sid);

  res.json({ message: 'Password updated' });
};

// update profile picture - stores file on disk, path in DB
// rate limiting handled by route middleware
export const updateProfilePicture = async (req, res) => {
  try {
    const { fileBuffer, fileExt } = await parseFileUpload(req);

    const type = validateUpload(fileBuffer);

    if (!type) {
      return res.status(400).json({ error: 'Invalid image upload' });
    }

    // only allow PNG explicitly
    if (type !== 'png') {
      return res.status(400).json({ error: 'Only PNG allowed' });
    }

    const max_size = 2 * 1024 * 1024;

    if (fileBuffer.length > max_size) {
      return res.status(400).json({ error: 'File too large' });
    }

    // generated filename, not user-controlled
    const fileName = `user-pfp_${req.userId}_${Date.now()}.png`;
    const uploadPath = path.join('uploads', fileName);

    // get current profile picture so we can delete it after saving the new one
    const result = await pool.query('SELECT profile_picture FROM users WHERE id = $1', [req.userId]);
    const { profile_picture } = result.rows[0] || {};

    await fs.promises.writeFile(uploadPath, fileBuffer);

    if (profile_picture) {
      try {
        await fs.promises.unlink(`.${profile_picture}`);
      } catch {
        // ignore - old file might already be gone
      }
    }

    await pool.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [`/uploads/${fileName}`, req.userId]);

    res.json({ success: true, path: `/uploads/${fileName}` });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};
