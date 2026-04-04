import pool from '../db.js';

export const findAll = async () => {
  const { rows } = await pool.query('SELECT id, username, email, is_admin, created_at FROM users');
  return rows;
};

export const findById = async (id) => {
  const { rows } = await pool.query('SELECT id, username, email, is_admin, created_at FROM users WHERE id = $1', [id]);
  return rows[0];
};
