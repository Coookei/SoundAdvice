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

// update profile picture - store in supabase database 
export const updateProfilePicture = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    // rate limiting to prevent DDoS attacks
    // initialise timestamp - time of users last upload stored 
    if (!req.session.lastUpload) req.session.lastUpload = 0;

    // get current time (milliseconds)
    const now = Date.now();

    // rate limiting to prevent brute force attacks 
    // block uploads if time since last upload less than 5000 milliseconds
    if (now - req.session.lastUpload < 5000) {
      return res.status(429).send('Too many uploads'); 
    }

    // parse upload 
    const { fileBuffer, fileExt } = await parseUpload(req); 

    // automated file name 
    const fileName = `user-pfp_${req.userId}_${Date.now()}.${fileExt}`;

    // safe storage path
    // filename automatically generated - prevents path traversal attacks 
    const uploadPath = path.join('uploads', fileName); 

    // get current profile picture
    const result = await pool.query(
        'SELECT profile_picture FROM users WHERE id = $1',
        [req.userId]
    );

    // delete old profile picture
    // get profile picture from 1st db row
    // continue if no row exists 
    const { profile_picture } = result.rows[0] || {};

    // save file
    await fs.promises.writeFile(uploadPath, fileBuffer); 

    if (profile_picture) {
        try {
            // delete old profile picture from disk 
            await fs.promises.unlink(`.${profile_picture}`); 
        } catch (err) {
            // ignore all errors 
        }
    }

     // save path in database
    await pool.query(
      'UPDATE users SET profile_picture = $1 WHERE id = $2',
      [`/uploads/${fileName}`, req.userId]
    );

    // update rate limit timestamp
    req.session.lastUpload = now; 

    // sends successful profile pic upload to frontend  
    // uploads stored separately 
    res.json({ success: true, path: `/uploads/${fileName}` });

  } catch (err) {
    console.error(err); 
    res.status(400).json({ error: err.message }); 
  }
} 