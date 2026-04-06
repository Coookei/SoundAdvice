import pool from '../db.js';

export const findAllApproved = async () => {
  const { rows } = await pool.query(
    "SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.status = 'approved' ORDER BY p.created_at DESC"
  );
  return rows;
};

export const findById = async (id) => {
  const { rows } = await pool.query(
    'SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1',
    [id]
  );
  return rows[0];
};

export const findByUserId = async (userId) => {
  const { rows } = await pool.query(
    'SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1 ORDER BY p.created_at DESC',
    [userId]
  );
  return rows;
};

export const findAll = async () => {
  const { rows } = await pool.query(
    'SELECT p.*, u.username FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC'
  );
  return rows;
};

export const create = async (userId, title, content) => {
  const { rows } = await pool.query('INSERT INTO posts (user_id, title, content) VALUES ($1, $2, $3) RETURNING *', [
    userId,
    title,
    content,
  ]);
  return rows[0];
};

export const update = async (id, title, content) => {
  const { rows } = await pool.query(
    'UPDATE posts SET title = $1, content = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
    [title, content, id]
  );
  return rows[0];
};

export const updateStatus = async (id, status) => {
  const { rows } = await pool.query('UPDATE posts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [
    status,
    id,
  ]);
  return rows[0];
};

export const remove = async (id) => {
  await pool.query('DELETE FROM posts WHERE id = $1', [id]);
};
