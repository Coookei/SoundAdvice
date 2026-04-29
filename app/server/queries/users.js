import pool from '../lib/db.js';
import { decrypt } from '../lib/crypto.js';

// get all users from the database
// specific with info to avoid exposising sensitive data - eg. passwords
export const findAll = async () => {
  const { rows } = await pool.query(
    'SELECT id, username, email_encrypted, is_admin, created_at, bio, profile_picture FROM users ORDER BY is_admin DESC, created_at ASC'
  );
  // pull email_encrypted, and remaining fields into rest, then return all rest properties + email
  return rows.map(({ email_encrypted, ...rest }) => ({ ...rest, email: decrypt(email_encrypted) }));
};

// find single users by their id
// id passed separately using placeholder to avoid SQL intection
export const findById = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, username, email_encrypted, is_admin, created_at, bio, profile_picture FROM users WHERE id = $1',
    [id]
  );
  if (!rows[0]) return undefined;
  // destructure to get email_encrypted and the remaing properties
  const { email_encrypted, ...rest } = rows[0];
  // rebuild object but without email_encrypted property
  return { ...rest, email: decrypt(email_encrypted) };
};

// checks if a user is an admin
// id passed using placeholder to prevent SQL injection - userId = $1
export const isAdmin = async (userId) => {
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);

  // prevents errors if no user found
  // ensures user + is_admin fields exist
  if (rows[0] && rows[0].is_admin !== undefined) {
    // if both present, returns true if admin found, false otherwise
    return rows[0].is_admin;
  } else {
    return false;
  }
};

export const updateBio = async (userId, bio) => {
  await pool.query('UPDATE users SET bio = $1 WHERE id = $2', [bio, userId]);
};

export const getProfilePicture = async (userId) => {
  const { rows } = await pool.query('SELECT profile_picture FROM users WHERE id = $1', [userId]);
  return rows[0]?.profile_picture;
};

export const updateProfilePicture = async (userId, path) => {
  await pool.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [path, userId]);
};
