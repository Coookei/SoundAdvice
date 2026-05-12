import pool from '../lib/db.js';

// get all approved posts - status must be approved
export const findAllApproved = async () => {
  // in all queries explicitly select fields to return over *, to prevent leaking data
  const { rows } = await pool.query(
    "SELECT p.id, p.user_id, p.title, p.content, p.created_at, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.status = 'approved' ORDER BY p.created_at DESC"
  );
  return rows;
};

// find a post by its post id
export const findById = async (id) => {
  const { rows } = await pool.query(
    'SELECT p.id, p.user_id, p.title, p.content, p.status, p.created_at, p.updated_at, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = $1',
    [id]
  );
  return rows[0];
};

// get only approved posts by user ID (for public profile page view)
export const findByUser = async (userId) => {
  const { rows } = await pool.query(
    "SELECT p.id, p.user_id, p.title, p.content, p.created_at, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1 AND p.status = 'approved' ORDER BY p.created_at DESC",
    [userId]
  );
  return rows;
};

// get ALL posts of all statuses for the current logged in user id
export const findByUserId = async (userId) => {
  const { rows } = await pool.query(
    'SELECT p.id, p.user_id, p.title, p.content, p.status, p.created_at, p.updated_at, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.user_id = $1 ORDER BY p.created_at DESC',
    [userId]
  );
  return rows;
};

// for admins to get all posts of all status for the admin panel
export const findAll = async () => {
  const { rows } = await pool.query(
    'SELECT p.id, p.user_id, p.title, p.content, p.status, p.created_at, p.updated_at, u.username FROM posts p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC'
  );
  return rows;
};

export const create = async (userId, title, content) => {
  const { rows } = await pool.query(
    'INSERT INTO posts (user_id, title, content) VALUES ($1, $2, $3) RETURNING id, user_id, title, content, status, created_at, updated_at',
    [userId, title, content]
  );
  return rows[0];
};

export const update = async (id, title, content, status = 'pending') => {
  // default to when updating post should go back to pending
  const { rows } = await pool.query(
    'UPDATE posts SET title = $1, content = $2, status = $3, updated_at = NOW() WHERE id = $4 RETURNING id, user_id, title, content, status, created_at, updated_at',
    [title, content, status, id]
  );
  return rows[0];
};

export const updateStatus = async (id, status) => {
  const { rows } = await pool.query(
    'UPDATE posts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, user_id, title, content, status, created_at, updated_at',
    [status, id]
  );
  return rows[0];
};

export const remove = async (id) => {
  await pool.query('DELETE FROM posts WHERE id = $1', [id]);
};

export const searchApproved = async (query) => {
  // for public search only want approved posts AND posts where the title or content contain the search query string
  // ILIKE does caseinsensitive pattern match, and %{query}% means anywhere so 'hello' matches 'Hello', 'a Hello' and 'Hello a'
  const { rows } = await pool.query(
    "SELECT p.id, p.user_id, p.title, p.content, p.created_at, u.username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.status = 'approved' AND (p.title ILIKE $1 OR p.content ILIKE $1) ORDER BY p.created_at DESC",
    [`%${query}%`]
  );
  return rows;
};
