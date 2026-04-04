import { Router } from 'express';
import { getCaptcha, register, login, verify2fa, logout, me } from '../controllers/auth.js';
import { rateLimit } from '../middleware/rate_limit.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/captcha', getCaptcha);
router.post('/register', register);
// 5 failed logins in 10 mins = blocked for 15 mins. reuse rateLimit() on other routes later
router.post('/login', rateLimit({ max: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }), login);
router.post('/verify-2fa', verify2fa);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

export default router;
