import { Router } from 'express';
import { getPostById, getPosts } from '../controllers/posts.js';

const router = Router();

router.get('/', getPosts);
router.get('/:id', getPostById);

export default router;
