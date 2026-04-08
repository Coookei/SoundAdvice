import { Router } from 'express';
import {
  createPost,
  deletePost,
  getAdminPosts,
  getMyPosts,
  getPostById,
  getPosts,
  updatePost,
  updatePostStatus,
  searchPosts,
} from '../controllers/posts.js';
import { requireAdmin, requireAuth } from '../middleware/auth.api.js';
import { rateLimit } from '../middleware/rate_limit.js';

const router = Router();

router.get('/', getPosts); // get all approved public posts
router.get('/search', searchPosts); // search approved posts with a query
router.get('/my', requireAuth, getMyPosts); // all posts of any status for current authd user
// can create 10 posts every 10 mins to prevent spam
router.post('/', requireAuth, rateLimit({ max: 10, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }), createPost); // authd users can create posts
router.get('/admin', requireAdmin, getAdminPosts); // admin only to get ALL posts of any status for admin panel
router.patch('/:id/status', requireAdmin, updatePostStatus); // admin only to approve/reject posts
router.get('/:id', getPostById); // get single post, approved posts are public, unapproved only visible to author or admin
// can update posts 20 times every 10 mins to allow bulk changes but prevent abuse
router.put('/:id', requireAuth, rateLimit({ max: 20, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 }), updatePost); // authd users can update their own posts, admin can update any post
// can delete posts 20 times every 10 mins to allow bulk deletes but prevent abuse
router.delete(
  '/:id',
  requireAuth,
  rateLimit({ max: 20, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 }),
  deletePost
); // authd users can delete their own posts, admin can delete any post

// GET /my, /search and /admin routes need be before /:id to avoid conflicts

export default router;
