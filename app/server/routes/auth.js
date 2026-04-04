import { Router } from 'express';
import { getCaptcha, register, login, verify2fa, logout, me } from '../controllers/auth.js';

const router = Router();

router.get('/captcha', getCaptcha);
router.post('/register', register);
router.post('/login', login);
router.post('/verify-2fa', verify2fa);
router.post('/logout', logout);
router.get('/me', me);

export default router;
