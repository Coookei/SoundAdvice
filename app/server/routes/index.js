import { Router } from 'express';
import { errorHandler, notFoundHandler } from '../middleware/error.js';
import pageRoutes from './pages.js';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import postRoutes from './posts.js';
import logRoutes from './logs.js';

const indexRouter = Router();

// HTML page routes to serve with clean URLs
indexRouter.use('/', pageRoutes);

// API routes
const api = Router();
api.use('/auth', authRoutes);
api.use('/users', userRoutes);
api.use('/posts', postRoutes);
api.use('/logs', logRoutes);

// API error handling
api.use(notFoundHandler);
api.use(errorHandler);

indexRouter.use('/api', api);

export default indexRouter;
