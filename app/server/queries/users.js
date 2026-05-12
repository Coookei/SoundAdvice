import pool from '../lib/db.js';
import { decrypt } from '../lib/crypto.js';

// get all users from the database for admin dashboard, but specific with info to avoid exposing sensitive data like passwords
// we also mask emails for user privacy, and for security
export const findAll = async () => {
  const { rows } = await pool.query(
    'SELECT id, username, email_encrypted, is_admin, created_at, bio, profile_picture FROM users ORDER BY is_admin DESC, created_at ASC'
  );
  // pull email_encrypted, and remaining fields into rest, then return all rest properties + masked email
  return rows.map(({ email_encrypted, ...rest }) => ({ ...rest, email: maskEmail(decrypt(email_encrypted)) }));
};

// private /auth/me response for user to get their own info, including their email
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

// for public profile, so only return restrictied info
export const findPublicById = async (id) => {
  const { rows } = await pool.query('SELECT id, username, created_at, bio, profile_picture FROM users WHERE id = $1', [
    id,
  ]);
  return rows[0];
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

// take first letter of email then hide rest, but keep domain
const maskEmail = (email) => {
  const [name, domain] = email.split('@');
  if (!name || !domain) {
    return 'Unknown';
  }
  return `${name[0]}***@${domain}`;
};
