import { Router } from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = (file) => join(__dirname, '../../public/html', file);

const router = Router();

router.get('/', (_req, res) => res.sendFile(html('index.html')));
router.get('/sign-in', (_req, res) => res.sendFile(html('signin.html')));
router.get('/sign-up', (_req, res) => res.sendFile(html('signup.html')));
router.get('/sign-in/2fa', (_req, res) => res.sendFile(html('signin_2fa.html')));
router.get('/post/new', (_req, res) => res.sendFile(html('post_new.html')));
router.get('/post/:id', (_req, res) => res.sendFile(html('post_details.html')));
router.get('/post/:id/edit', (_req, res) => res.sendFile(html('post_edit.html')));
router.get('/my-posts', (_req, res) => res.sendFile(html('my_posts.html')));
router.get('/profile', (_req, res) => res.sendFile(html('profile.html')));
router.get('/admin/approval', (_req, res) => res.sendFile(html('admin_approval.html')));

export default router;
