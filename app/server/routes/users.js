import { Router } from 'express';

// import contorller functions 
import { 
    getUserById, 
    getUsers, 
    getMe, 
    updateBio, 
    updatePassword, 
    updateProfilePicture 
} from '../controllers/users.js';

// middleware for authentcation + authorization 
import { requireAdmin, requireAuth } from '../middleware/auth.api.js';

import uploadRouter from '../middleware/upload.js'; 

import { parseUpload } from '../middleware/upload.js'; 

const router = Router();

// update profile picture - requires authentication + file upload 
router.use('/pfp', requireAuth, uploadRouter); 

// get current user 
router.get('/me', requireAuth, getMe); 

// get all users - admin only 
router.get('/', requireAdmin, getUsers);

// gets specific user by id - admin only 
router.get('/:id', requireAdmin, getUserById);

// update bio requires authentication 
router.post('/bio', requireAuth, updateBio); 

// update password requires authentication 
router.post('/password', requireAuth, updatePassword);

router.post(
    '/upload-pfp',
    parseUpload,
    updateProfilePicture
); 

export default router;
