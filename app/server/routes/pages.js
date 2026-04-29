import { Router } from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  redirectIfGuest,
  redirectIfNotAdmin,
  redirectIfAuthed,
  redirectIfNotPending,
} from '../middleware/auth.page.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = (file) => join(__dirname, '../../public/html', file);

const router = Router();

router.get('/', (_req, res) => res.sendFile(html('index.html')));
router.get('/sign-in', redirectIfAuthed, (_req, res) => res.sendFile(html('signin.html')));
router.get('/sign-up', redirectIfAuthed, (_req, res) => res.sendFile(html('signup.html')));
router.get('/sign-in/2fa', redirectIfNotPending, (_req, res) => res.sendFile(html('signin_2fa.html')));
router.get('/forgot-password', redirectIfAuthed, (_req, res) => res.sendFile(html('forgot_password.html')));
router.get('/forgot-password/code', redirectIfAuthed, (_req, res) => res.sendFile(html('forgot_password_code.html')));
router.get('/forgot-password/reset', redirectIfAuthed, (_req, res) => res.sendFile(html('forgot_password_reset.html')));
router.get('/my-posts', redirectIfGuest, (_req, res) => res.sendFile(html('my_posts.html'))); //protected
router.get('/profile', redirectIfGuest, (_req, res) => res.sendFile(html('profile.html'))); // protected
router.get('/post/new', redirectIfGuest, (_req, res) => res.sendFile(html('post_new.html'))); // protected
router.get('/search', (_req, res) => res.sendFile(html('search.html'))); // search is public so no auth
router.get('/post/:id', (_req, res) => res.sendFile(html('post_details.html'))); // guests can view posts so no auth
router.get('/post/:id/edit', redirectIfGuest, (_req, res) => res.sendFile(html('post_edit.html'))); // edit post is protected
router.get('/admin/approval', redirectIfNotAdmin, (_req, res) => res.sendFile(html('admin_approval.html'))); // admin protection
router.get('/admin/users', redirectIfNotAdmin, (_req, res) => res.sendFile(html('admin_users.html'))); // admin protection

export default router;
