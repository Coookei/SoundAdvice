import { Router } from 'express';
import { register, login, verify2fa, logout, me } from '../controllers/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-2fa', verify2fa);
router.post('/logout', logout);
router.get('/me', me);

export default router;
