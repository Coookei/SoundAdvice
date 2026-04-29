import pool from '../lib/db.js';

export const findByPostId = async (postId) => {
  const { rows } = await pool.query(
    'SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at ASC',
    [postId]
  );
  return rows;
};

export const create = async (postId, userId, content) => {
  const { rows } = await pool.query(
    'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id, post_id, user_id, content, created_at',
    [postId, userId, content]
  );
  return rows[0];
};

export const findById = async (id) => {
  const { rows } = await pool.query('SELECT id, post_id, user_id, content, created_at FROM comments WHERE id = $1', [
    id,
  ]);
  return rows[0];
};

export const remove = async (id) => {
  await pool.query('DELETE FROM comments WHERE id = $1', [id]);
};
