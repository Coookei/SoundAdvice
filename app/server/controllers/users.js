import crypto from 'crypto';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { decrypt, hashCode } from '../lib/crypto.js';
import { sendEmail } from '../lib/email.js';
import { parseFileUpload } from '../lib/upload.js';
import * as authQueries from '../queries/auth.js';
import * as sessionQueries from '../queries/sessions.js';
import * as userQueries from '../queries/users.js';

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
  res.json({ users });
};

// get user by their profile ID
export const getUserById = async (req, res) => {
  const { id } = req.params;

  const user = await userQueries.findById(id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ user });
};

// update bio
export const updateBio = async (req, res) => {
  let { bio } = req.body;

  if (typeof bio !== 'string') {
    return res.status(400).json({ error: 'Invalid bio type' });
  }

  bio = bio.trim();

  if (bio.length > 500) {
    return res.status(400).json({ error: 'Bio must be 500 characters or less' });
  }

  await userQueries.updateBio(req.userId, bio);

  res.json({ success: true });
};

// step 1 of password change: verify current password, email a code, stash new hash
export const requestPasswordChange = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  const user = await authQueries.getPasswordAndEmail(req.userId);
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

  await authQueries.updatePassword(req.userId, pending.newHash);
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

    // only allow PNG explicitly
    if (fileExt !== 'png') {
      return res.status(400).json({ error: 'Only PNG allowed' });
    }

    // generated filename, not user-controlled
    const fileName = `user-pfp_${req.userId}_${Date.now()}.png`;
    const uploadPath = path.join('uploads', fileName);

    // get current profile picture so we can delete it after saving the new one
    const oldPicture = await userQueries.getProfilePicture(req.userId);

    await fs.promises.mkdir('uploads', { recursive: true }); // ensure /uploads dir exists
    await fs.promises.writeFile(uploadPath, fileBuffer);

    if (oldPicture) {
      try {
        await fs.promises.unlink(`.${oldPicture}`);
      } catch {
        // ignore - old file might already be gone
      }
    }

    await userQueries.updateProfilePicture(req.userId, `/uploads/${fileName}`);

    res.json({ success: true, path: `/uploads/${fileName}` });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};
