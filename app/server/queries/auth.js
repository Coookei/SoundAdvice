import pool from '../lib/db.js';
import { encrypt, decrypt, hashForLookup } from '../lib/crypto.js';

export const findByEmail = async (email) => {
  const { rows } = await pool.query('SELECT id, password, is_admin, email_encrypted FROM users WHERE email_hash = $1', [
    hashForLookup(email),
  ]);
  if (!rows[0]) return undefined;
  // decrypt so the caller can use it (e.g. to send a 2FA email)
  return { ...rows[0], email: decrypt(rows[0].email_encrypted) };
};

export const createUser = async (username, email, hashedPassword) => {
  const { rows } = await pool.query(
    'INSERT INTO users (username, email_hash, email_encrypted, password) VALUES ($1, $2, $3, $4) RETURNING id',
    [username, hashForLookup(email), encrypt(email), hashedPassword]
  );
  return rows[0];
};

export const setEmailCode = async (userId, codeHash, expiresAt) => {
  await pool.query('UPDATE users SET email_code = $1, email_code_expires = $2 WHERE id = $3', [
    codeHash,
    expiresAt,
    userId,
  ]);
};

export const getEmailCode = async (userId) => {
  const { rows } = await pool.query('SELECT email_code, email_code_expires FROM users WHERE id = $1', [userId]);
  return rows[0];
};

export const clearEmailCode = async (userId) => {
  await pool.query('UPDATE users SET email_code = NULL, email_code_expires = NULL WHERE id = $1', [userId]);
};

export const setResetToken = async (userId, token, expiresAt) => {
  await pool.query('UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3', [
    token,
    expiresAt,
    userId,
  ]);
};

export const findByResetToken = async (token) => {
  const { rows } = await pool.query('SELECT id, password_reset_expires FROM users WHERE password_reset_token = $1', [
    token,
  ]);
  return rows[0];
};

export const clearResetToken = async (userId) => {
  await pool.query('UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1', [
    userId,
  ]);
};

export const updatePassword = async (userId, hashedPassword) => {
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
};
