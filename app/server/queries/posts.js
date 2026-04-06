import pool from '../db.js';

// get all approved posts - status must be approved 
export const findAllApproved = async () => {
  const { rows } = await pool.query("SELECT * FROM posts WHERE status = 'approved' ORDER BY created_at DESC");
  return rows;
};

// get single post by its ID 
// ID passed as parameter to avoid SQL injection 
// ensures post approved before returning it 
export const findApprovedById = async (id) => {
  const { rows } = await pool.query("SELECT * FROM posts WHERE id = $1 AND status = 'approved'", [id]);
  return rows[0];
};

// find posts by specific username
// posts ordered by most recent first
// prevents SQL injection - separates query from input values 
export const findByUser = async(userId) => {
  const { rows } = await pool.query(
    "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
  return rows;
}; 