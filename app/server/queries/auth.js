import pool from '../db.js';

export const findByEmail = async (email) => {
  const { rows } = await pool.query('SELECT id, password, is_admin FROM users WHERE email = $1', [email]);
  return rows[0];
};

export const createUser = async (username, email, hashedPassword) => {
  const { rows } = await pool.query(
    'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
    [username, email, hashedPassword]
  );
  return rows[0];
};

export const setEmailCode = async (userId, code, expiresAt) => {
  await pool.query(
    'UPDATE users SET email_code = $1, email_code_expires = $2 WHERE id = $3',
    [code, expiresAt, userId]
  );
};

export const getEmailCode = async (userId) => {
  const { rows } = await pool.query(
    'SELECT email_code, email_code_expires FROM users WHERE id = $1',
    [userId]
  );
  return rows[0];
};

export const clearEmailCode = async (userId) => {
  await pool.query(
    'UPDATE users SET email_code = NULL, email_code_expires = NULL WHERE id = $1',
    [userId]
  );
};
