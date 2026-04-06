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
} from '../controllers/posts.js';
import { requireAdmin, requireAuth } from '../middleware/auth.api.js';

const router = Router();

router.get('/', getPosts); // get all approved public posts
router.get('/my', requireAuth, getMyPosts); // all posts of any status for current authd user
router.post('/', requireAuth, createPost); // authd users can create posts
router.get('/admin', requireAdmin, getAdminPosts); // admin only to get ALL posts of any status for admin panel
router.patch('/:id/status', requireAdmin, updatePostStatus); // admin only to approve/reject posts
router.get('/:id', getPostById); // get single post, approved posts are public, unapproved only visible to author or admin
router.put('/:id', requireAuth, updatePost); // authd users can update their own posts, admin can update any post
router.delete('/:id', requireAuth, deletePost); // authd users can delete their own posts, admin can delete any post

// /my and /admin routes need be before /:id to avoid conflicts

export default router;
