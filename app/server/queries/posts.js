import pool from '../db.js';

export const findAllApproved = async () => {
  const { rows } = await pool.query("SELECT * FROM posts WHERE status = 'approved' ORDER BY created_at DESC");
  return rows;
};

export const findById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
  return rows[0];
};
