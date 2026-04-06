import pool from '../db.js';

export const findAllApproved = async () => {
  const { rows } = await pool.query("SELECT * FROM posts WHERE status = 'approved' ORDER BY created_at DESC");
  return rows;
};

export const findApprovedById = async (id) => {
  const { rows } = await pool.query("SELECT * FROM posts WHERE id = $1 AND status = 'approved'", [id]);
  return rows[0];
};
