import { Router } from 'express';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { injectIntegrity } from '../lib/sri.js';
import {
  redirectIfGuest,
  redirectIfNotAdmin,
  redirectIfAuthed,
  redirectIfNotPending,
} from '../middleware/auth.page.js';

const isDev = process.env.NODE_ENV !== 'production';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = (file) => join(__dirname, '../../public/html', file);

const loadPage = (file) => {
  return injectIntegrity(fs.readFileSync(htmlPath(file), 'utf-8'));
};

const sendPage = (file) => {
  // read the page off disk, inject SRI hashes into its <script> tags, then send it
  const cached = isDev ? null : loadPage(file); // in prod the HTML is cached in memory
  return (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(isDev ? loadPage(file) : cached);
  };
};

const router = Router();

router.get('/', sendPage('index.html'));
router.get('/sign-in', redirectIfAuthed, sendPage('signin.html'));
router.get('/sign-up', redirectIfAuthed, sendPage('signup.html'));
router.get('/sign-in/2fa', redirectIfNotPending, sendPage('signin_2fa.html'));
router.get('/forgot-password', redirectIfAuthed, sendPage('forgot_password.html'));
router.get('/forgot-password/code', redirectIfAuthed, sendPage('forgot_password_code.html'));
router.get('/forgot-password/reset', redirectIfAuthed, sendPage('forgot_password_reset.html'));
router.get('/sign-in/magic-link', redirectIfAuthed, sendPage('magic_link.html'));
router.get('/sign-in/magic-link/confirm', redirectIfAuthed, sendPage('magic_link_confirm.html'));
router.get('/my-posts', redirectIfGuest, sendPage('my_posts.html')); // protected
router.get('/profile', redirectIfGuest, sendPage('profile.html')); // protected
router.get('/profile/:id', sendPage('profile_public.html')); // public
router.get('/post/new', redirectIfGuest, sendPage('post_new.html')); // protected
router.get('/search', sendPage('search.html')); // public
router.get('/post/:id', sendPage('post_details.html')); // public
router.get('/post/:id/edit', redirectIfGuest, sendPage('post_edit.html')); // protected
router.get('/admin/approval', redirectIfNotAdmin, sendPage('admin_approval.html')); // admin only
router.get('/admin/users', redirectIfNotAdmin, sendPage('admin_users.html')); // admin only
router.get('/admin/logs', redirectIfNotAdmin, sendPage('admin_logs.html')); // admin only

export default router;
