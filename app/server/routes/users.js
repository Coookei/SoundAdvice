import { Router } from 'express';
import { getUserById, getUsers } from '../controllers/users.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// currently these user endpoints arent used anywhere but keeping
// for potential admin feature to view users.
router.get('/', requireAdmin, getUsers);
router.get('/:id', requireAdmin, getUserById);

export default router;
