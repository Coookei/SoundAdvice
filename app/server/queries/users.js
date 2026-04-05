import pool from '../db.js';

export const findAll = async () => {
  const { rows } = await pool.query('SELECT id, username, email, is_admin, created_at FROM users');
  return rows;
};

export const findById = async (id) => {
  const { rows } = await pool.query('SELECT id, username, email, is_admin, created_at FROM users WHERE id = $1', [id]);
  return rows[0];
};

export const isAdmin = async (userId) => {
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return rows[0]?.is_admin ?? false;
};
