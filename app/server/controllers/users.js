import * as userQueries from '../queries/users.js';
import pool from '../db.js'; 
import supabase from '../supabase.js'; 
import bcrypt from 'bcrypt';

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
     // check if file uploaded 
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded'});
  }

  const file = req.file; 

  // generate filename 
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${req.userId}.${fileExt}`; 

  // upload file to supabase storage - use profile pictures bucket
  const { error } = await supabase.storage
    .from('profile-pictures')
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

    // upload error handling
    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    // get public URL of profile picture 
    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    const publicUrl = data.publicUrl; 

    // save URL in database
    // sql injection prevented - parameterised queries with placeholders 
    // uses array - database url = $1, userId = $2
    // ensures only current users profile picture is updated
    // changes reflected in database 
    await pool.query(
      'UPDATE users SET profile_picture = $1 WHERE id = $2',
      [publicUrl, req.userId]
    ); 

    // output message 
    res.json({ success: true, profile_picture: publicUrl }); 

    // throws error if profile picture couldn't be uploaded 
  } catch (err) {
    console.error('Profile picture upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}; 
 