import * as userQueries from '../queries/users.js';
import pool from '../db.js'; 
import fs from 'fs';
import path from 'path'; 
import bcrypt from 'bcrypt';
import { parseUpload } from '../middleware/upload.js';

// gets all users 
export const getUsers = async (req, res) => {
  const users = await userQueries.findAll();
  res.json({ users });
};

// gets currently authenticated user 
export const getMe = async (req, res) => {
  try{ 
    // ensures user is logged in 
    if (!req.userId) {
        return res.status(401).json({error: 'Not logged in'});
     }

    // fetches user from database
    const user = await userQueries.findById(req.userId); 
      res.json({ user }); 

      // profile couldn't be fetched 
    } catch (err) {
      console.error('Get my profile error', err);
      res.status(500).json({ error: 'Server error '});
  }
};

// get user by their profile ID 
export const getUserById = async (req, res) => {
  const { id } = req.params;

  const user = await userQueries.findById(id);

  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ user });
};

// update bio 
export const updateBio = async (req, res) => {
  const { bio } = req.body;

  // update bio of currently logged in user - only currently logged in user can do this to their own bio 
  // uses an array - bio = $1, userId = $2
  // prevents SQL injection - actual values not visible in database due to being passed into a separate array 
  await pool.query(
    'UPDATE users SET bio = $1 WHERE id = $2',
    [bio, req.userId]
  ); 

  res.json({ success: true }); 
}; 

// update password
export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // gets stored password for current user 
  // user Id used to ensure access to only current users data
  // prevents sql injection - actual values passed separately in the array, not the query 
  // actual values not visible in database 
  const userResult = await pool.query(
    'SELECT password FROM users WHERE id = $1',
    [req.userId]
  ); 

  const user = userResult.rows[0];

  // verifies current password 
  const valid = await bcrypt.compare(
    // current password peppered using bcrypt 
    currentPassword + process.env.PEPPER, user.password);

  if (!valid) {
    return res.status(400).json({ error: 'Incorrect current password' });
  }

  // hash new password - pepper it again using bcrypt
  // uses 12 rounds of hashing - salting added automatically 
  const hashed = await bcrypt.hash(newPassword + process.env.PEPPER, 12);

  // updates password in database for current user only
  // parameterised query - prevents sql injection - actual values passed separately in the array, not the query 
  // uses array, hashed = $1, userId = $2 
  await pool.query(
    'UPDATE users SET password = $1 where id = $2',
    [hashed, req.userId]
  );

  res.json({ success: true });
}; 

// update profile picture - stores file on disk, path in DB
// rate limiting handled by route middleware
export const updateProfilePicture = async (req, res) => {
  try {
    const { fileBuffer, fileExt } = await parseUpload(req);

    // generated filename, not user-controlled, so prevents path traversal
    const fileName = `user-pfp_${req.userId}_${Date.now()}.${fileExt}`;
    const uploadPath = path.join('uploads', fileName);

    // get current profile picture so we can delete it after saving the new one
    const result = await pool.query('SELECT profile_picture FROM users WHERE id = $1', [req.userId]);
    const { profile_picture } = result.rows[0] || {};

    await fs.promises.writeFile(uploadPath, fileBuffer);

    if (profile_picture) {
      try {
        await fs.promises.unlink(`.${profile_picture}`);
      } catch {
        // ignore - old file might already be gone
      }
    }

    await pool.query('UPDATE users SET profile_picture = $1 WHERE id = $2', [`/uploads/${fileName}`, req.userId]);

    res.json({ success: true, path: `/uploads/${fileName}` });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};