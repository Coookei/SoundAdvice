import { Router } from 'express';
import { getCaptcha, register, login, verify2fa, logout, me } from '../controllers/auth.js';
import { rateLimit } from '../middleware/rate_limit.js';
import { requireGuest, requirePending, requireSession } from '../middleware/auth.api.js';

const router = Router();

router.get('/captcha', requireGuest, getCaptcha);
router.post('/register', requireGuest, register); // TODO rate limit register
// 5 failed logins in 10 mins = blocked for 15 mins. reuse rateLimit() on other routes later
router.post('/login', requireGuest, rateLimit({ max: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }), login);
router.post('/verify-2fa', requirePending, verify2fa);
router.post('/logout', requireSession, logout);
router.get('/me', me); // return user if logged in otherwise null, so no auth required

export default router;
