import pool from '../lib/db.js';
import { encrypt, decrypt, hashForLookup } from '../lib/crypto.js';

export const findByEmail = async (email) => {
  const { rows } = await pool.query('SELECT id, password, is_admin, email_encrypted FROM users WHERE email_hash = $1', [
    hashForLookup(email),
  ]);
  if (!rows[0]) return undefined;
  // remove email_encrypted, and replace with the decrypted email
  const { email_encrypted, ...rest } = rows[0];
  return { ...rest, email: decrypt(email_encrypted) };
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
  const { rows } = await pool.query(
    'SELECT id, username, email_encrypted, password_reset_expires FROM users WHERE password_reset_token = $1',
    [token]
  );
  if (!rows[0]) return undefined;
  // remove email_encrypted, and replace with the decrypted email
  const { email_encrypted, ...rest } = rows[0];
  return { ...rest, email: decrypt(email_encrypted) };
};

export const clearResetToken = async (userId) => {
  await pool.query('UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1', [
    userId,
  ]);
};

export const updatePassword = async (userId, hashedPassword) => {
  await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);
};

export const getPasswordAndEmail = async (userId) => {
  // aslo load username, as used by password screening check when changing password
  const { rows } = await pool.query('SELECT username, password, email_encrypted FROM users WHERE id = $1', [userId]);
  if (!rows[0]) return undefined;
  // remove email_encrypted, and replace with the decrypted email
  const { email_encrypted, ...rest } = rows[0];
  return { ...rest, email: decrypt(email_encrypted) };
};

export const setMagicLinkToken = async (userId, tokenHash, expiresAt) => {
  await pool.query('UPDATE users SET magic_link_token = $1, magic_link_expires = $2 WHERE id = $3', [
    tokenHash,
    expiresAt,
    userId,
  ]);
};

export const consumeMagicLinkToken = async (tokenHash) => {
  // return and clear the token in one query to prevent race conditions.
  // if token expired, no rows returned, so user cant login. The expired token will eventually be overritten by a future request, so no need to clear expired tokens here.
  const { rows } = await pool.query(
    `UPDATE users SET magic_link_token = NULL, magic_link_expires = NULL
     WHERE magic_link_token = $1 AND magic_link_expires > NOW()
     RETURNING id, is_admin`,
    [tokenHash]
  );
  return rows[0];
};
