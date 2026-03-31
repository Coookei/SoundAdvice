import pool from '../db.js';

export const findAll = async () => {
  const { rows } = await pool.query('SELECT * FROM users');
  return rows;
};

export const findById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
};
