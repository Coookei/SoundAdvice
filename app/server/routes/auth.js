import { Router } from 'express';
import {
  getCaptcha,
  register,
  login,
  verify2fa,
  logout,
  me,
  forgotRequest,
  forgotVerify,
  forgotReset,
} from '../controllers/auth.js';
import { rateLimit } from '../middleware/rate_limit.js';
import { requireGuest, requirePending, requireSession } from '../middleware/auth.api.js';
import { csrfProtection } from '../middleware/csrf.js';

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

router.get('/me', me); // return user if logged in otherwise null, so no auth required

// forgot-password flow. request is tighter than verify/reset because it triggers emails
router.post(
  '/forgot-password/request',
  requireGuest,
  rateLimit({ max: 3, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  forgotRequest
);
router.post(
  '/forgot-password/verify',
  requireGuest,
  rateLimit({ max: 6, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  forgotVerify
);
router.post(
  '/forgot-password/reset',
  requireGuest,
  rateLimit({ max: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  forgotReset
);

router.post('/logout', csrfProtection, requireSession, logout); // this is only auth route that needs csrf protection

export default router;
