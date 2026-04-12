import pool from '../db.js';
import { decrypt } from '../crypto.js';

export const findAll = async () => {
  const { rows } = await pool.query(
    'SELECT id, username, email_encrypted, is_admin, created_at FROM users ORDER BY is_admin DESC, created_at ASC'
  );
  return rows.map((r) => ({ ...r, email: decrypt(r.email_encrypted), email_encrypted: undefined }));
};

export const findById = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, username, email_encrypted, is_admin, created_at FROM users WHERE id = $1',
    [id]
  );
  if (!rows[0]) return undefined;
  return { ...rows[0], email: decrypt(rows[0].email_encrypted), email_encrypted: undefined };
};

export const isAdmin = async (userId) => {
  const { rows } = await pool.query('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return rows[0]?.is_admin ?? false;
};
