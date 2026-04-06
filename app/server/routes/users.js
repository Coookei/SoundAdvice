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

// middleware for file uploads 
import upload from '../middleware/upload.js'; 

const router = Router();

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

// update profile picture - requires authentication + file upload 
router.post(
    '/pfp',
    requireAuth,
    upload.single('pfp'),
    updateProfilePicture
); 

export default router;
