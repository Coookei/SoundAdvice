import { Router } from 'express';
import {
  getUserById,
  getUsers,
  updateBio,
  requestPasswordChange,
  confirmPasswordChange,
  updateProfilePicture,
} from '../controllers/users.js';
import { requireAdmin, requireAuth } from '../middleware/auth.api.js';
import { rateLimit } from '../middleware/rate_limit.js';

const router = Router();

router.get('/', requireAdmin, getUsers); // all users, for admin dashboard
router.get('/:id', requireAdmin, getUserById); // not currently used

router.post('/bio', requireAuth, rateLimit({ max: 10, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }), updateBio); // update own bio

// password change is two-step: request code (rate limited, prevents email spam), then confirm
router.post(
  '/password/request',
  requireAuth,
  rateLimit({ max: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  requestPasswordChange
);
router.post(
  '/password/confirm',
  requireAuth,
  rateLimit({ max: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  confirmPasswordChange
);

// 10 uploads per 10 mins to prevent disk spam
router.post(
  '/upload-pfp',
  requireAuth,
  rateLimit({ max: 10, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  updateProfilePicture
);

export default router;
