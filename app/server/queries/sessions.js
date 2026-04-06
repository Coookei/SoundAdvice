import pool from '../db.js';

export const findSessionBySid = async (sid) => {
  const { rows } = await pool.query('SELECT user_id, pending, expires_at FROM sessions WHERE sid = $1', [sid]);
  return rows[0];
};

export const insertSession = async (sid, userId, pending, expiresAt) => {
  await pool.query('INSERT INTO sessions (sid, user_id, pending, expires_at) VALUES ($1, $2, $3, $4)', [
    sid,
    userId,
    pending,
    expiresAt,
  ]);
};

export const deleteSessionBySid = async (sid) => {
  await pool.query('DELETE FROM sessions WHERE sid = $1', [sid]);
};

export const increment2faAttempts = async (userId) => {
  const { rows } = await pool.query(
    'UPDATE sessions SET two_factor_attempts = two_factor_attempts + 1 WHERE user_id = $1 AND pending = true RETURNING two_factor_attempts',
    [userId]
  );
  return rows[0];
};
