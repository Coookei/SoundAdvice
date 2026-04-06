import { Router } from 'express';
import { getPostById, getPosts, getPostByUser } from '../controllers/posts.js';

const router = Router();

router.get('/', getPosts); // posts publicly available so no auth
router.get('/user/:userId', getPostByUser); // gets all posts belonging to specific user 
router.get('/:id', getPostById); // public

export default router;
