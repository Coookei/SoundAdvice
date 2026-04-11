import { Router } from 'express';
import { getUserById, getUsers } from '../controllers/users.js';
import { requireAdmin } from '../middleware/auth.api.js';

const router = Router();

router.get('/', requireAdmin, getUsers); // returns all users, for admin dashboard
router.get('/:id', requireAdmin, getUserById); // not currently used

export default router;
