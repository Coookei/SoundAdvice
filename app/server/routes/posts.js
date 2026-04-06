import { Router } from 'express';
import { getPostById, getPosts } from '../controllers/posts.js';

const router = Router();

router.get('/', getPosts); // posts publicly available so no auth
router.get('/:id', getPostById); // public

export default router;
