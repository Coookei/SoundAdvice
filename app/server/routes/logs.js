import { Router } from 'express';
import { getLogs, verifyLogs } from '../controllers/logs.js';
import { requireAdmin } from '../middleware/auth.api.js';
import { csrfProtection } from '../middleware/csrf.js';

const router = Router();

// not applying rate limit here as both admin only routes

router.get('/', requireAdmin, getLogs);
router.post('/verify', csrfProtection, requireAdmin, verifyLogs);

export default router;
