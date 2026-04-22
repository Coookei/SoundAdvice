import { Router } from 'express';
import { getUserById, getUsers, getMe, updateBio, updatePassword, updateProfilePicture } from '../controllers/users.js';
import { requireAdmin, requireAuth } from '../middleware/auth.api.js';
import { rateLimit } from '../middleware/rate_limit.js';

const router = Router();

router.get('/me', requireAuth, getMe); // current user
router.get('/', requireAdmin, getUsers); // all users, for admin dashboard
router.get('/:id', requireAdmin, getUserById); // not currently used

router.post('/bio', requireAuth, updateBio); // update own bio
router.post('/password', requireAuth, updatePassword); // change own password
// 10 uploads per 10 mins to prevent disk spam
router.post(
  '/upload-pfp',
  requireAuth,
  rateLimit({ max: 10, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  updateProfilePicture
);

export default router;
