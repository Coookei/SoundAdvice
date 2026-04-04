import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { sessionMiddleware } from './middleware/session.js';
import indexRouter from './routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(sessionMiddleware); // attach req.userId from session cookie on every request
app.use('/html', (_req, res) => res.status(403).send('Forbidden')); // block direct access to html files, only served via protected page routes
app.use(express.static(join(__dirname, '../public'))); // serve ALL static assets from public dir, while protecting from traversing out in url eg ../../

// page routes and API routes
app.use('/', indexRouter);

// not found 404 page
app.use((_req, res) => res.status(404).send('404 - Page not found'));

export default app;
