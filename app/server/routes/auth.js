import { Router } from 'express';
import { getCaptcha, register, login, verify2fa, logout, me } from '../controllers/auth.js';
import { rateLimit } from '../middleware/rate_limit.js';
import { requireGuest, requirePending, requireSession } from '../middleware/auth.api.js';

const router = Router();

router.get('/captcha', requireGuest, getCaptcha);
// 5 failed logins in 10 mins = blocked for 15 mins
router.post('/login', requireGuest, rateLimit({ max: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }), login);

// 5 registrations in 10 mins = blocked for 15 mins
router.post(
  '/register',
  requireGuest,
  rateLimit({ max: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  register
);

// 6 failed 2FA attempts in 10 mins = blocked for 15 mins
// 2FA route limited here per ip, then in controller, code can only be entered 3 times before user must relogin
router.post(
  '/verify-2fa',
  requirePending,
  rateLimit({ max: 6, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  verify2fa
);

router.post('/logout', requireSession, logout);
router.get('/me', me); // return user if logged in otherwise null, so no auth required

export default router;
