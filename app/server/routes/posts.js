import { Router } from 'express';
import {
  createPost,
  deletePost,
  getAdminPosts,
  getMyPosts,
  getPostById,
  getPostByUser,
  getPosts,
  updatePost,
  updatePostStatus,
  searchPosts,
} from '../controllers/posts.js';
import { getComments, createComment, deleteComment } from '../controllers/comments.js';
import { requireAdmin, requireAuth } from '../middleware/auth.api.js';
import { rateLimit } from '../middleware/rate_limit.js';

const router = Router();

// GET /my, /search, /admin and /user routes need be before /:id to avoid conflicts

router.get('/', getPosts); // get all approved public posts
router.get('/search', searchPosts); // search approved posts with a query
router.get('/my', requireAuth, getMyPosts); // all posts of any status for current authd user
router.get('/user/:userId', getPostByUser); // approved posts for a given user (profile page)
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

router.get('/:id/comments', getComments); // get all comments for a post, approved posts comments are public, unapproved posts comments only visible to author or admin
// can create 15 comments every 10 mins
router.post(
  '/:id/comments',
  requireAuth,
  rateLimit({ max: 15, windowMs: 10 * 60 * 1000, blockMs: 15 * 60 * 1000 }),
  createComment
); // authd users can create comments on approved posts

// can delete 20 comments every 10 mins
router.delete(
  '/:id/comments/:commentId',
  requireAuth,
  rateLimit({ max: 20, windowMs: 10 * 60 * 1000, blockMs: 10 * 60 * 1000 }),
  deleteComment
); // authd users can delete their own comments, admin can delete any comment

export default router;
