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
  magicLinkRequest,
  magicLinkVerify,
} from '../controllers/auth.js';
import { rateLimit } from '../middleware/rate_limit.js';
import { requireGuest, requirePending, requireSession } from '../middleware/auth.api.js';
import { csrfProtection } from '../middleware/csrf.js';
import { requireSameOrigin } from '../middleware/origin.js';

const router = Router();

router.get('/captcha', requireGuest, getCaptcha); // get a captcha challenge for registration, no auth required
router.get('/me', me); // return user if logged in otherwise null, so no auth required
router.post('/logout', csrfProtection, requireSession, logout); // this is only auth route that needs csrf protection as user has active session

// THE FOLLOWING auth POST routes are public guest routes, so no active session
// but to prevent CSRF such as logging a user into an attackers account, we check that the request came from our own site

// 5 failed logins in 10 mins = blocked for 15 mins
router.post(
  '/login',
  requireSameOrigin,
  requireGuest,
  rateLimit({ max: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  login
);

// 5 registrations in 10 mins = blocked for 15 mins
router.post(
  '/register',
  requireSameOrigin,
  requireGuest,
  rateLimit({ max: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  register
);

// 6 failed 2FA attempts in 10 mins = blocked for 15 mins
// 2FA route limited here per ip, then in controller, code can only be entered 3 times before user must relogin
router.post(
  '/verify-2fa',
  requireSameOrigin,
  requirePending,
  rateLimit({ max: 6, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  verify2fa
);

// forgot-password flow. request is tighter than verify/reset because it triggers emails
router.post(
  '/forgot-password/request',
  requireSameOrigin,
  requireGuest,
  rateLimit({ max: 3, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  forgotRequest
);
router.post(
  '/forgot-password/verify',
  requireSameOrigin,
  requireGuest,
  rateLimit({ max: 6, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  forgotVerify
);
router.post(
  '/forgot-password/reset',
  requireSameOrigin,
  requireGuest,
  rateLimit({ max: 5, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  forgotReset
);

// magic link flow. request is tighter than verify because it triggers emails
router.post(
  '/magic-link/request',
  requireSameOrigin,
  requireGuest,
  rateLimit({ max: 3, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  magicLinkRequest
);
router.post(
  '/magic-link/verify',
  requireSameOrigin,
  requireGuest,
  rateLimit({ max: 6, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  magicLinkVerify
);

export default router;
