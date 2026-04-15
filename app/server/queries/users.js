import pool from '../db.js';
import { decrypt } from '../crypto.js';

export const findAll = async () => {
  const { rows } = await pool.query(
    'SELECT id, username, email_encrypted, is_admin, created_at FROM users ORDER BY is_admin DESC, created_at ASC'
  );
  // pull email_encrypted, and remaining fields into rest, then return all rest properties + email
  return rows.map(({ email_encrypted, ...rest }) => ({ ...rest, email: decrypt(email_encrypted) }));
};

export const findById = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, username, email_encrypted, is_admin, created_at FROM users WHERE id = $1',
    [id]
  );
  if (!rows[0]) return undefined;
  // destructure to get email_encrypted and the remaing properties
  const { email_encrypted, ...rest } = rows[0];
  // rebuild object but without email_encrypted property
  return { ...rest, email: decrypt(email_encrypted) };
};

export const isAdmin = async (userId) => {
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return rows[0]?.is_admin ?? false;
};
