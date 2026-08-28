import express from 'express';
import path from 'path';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { headersMiddleware } from './middleware/headers.js';
import { sessionMiddleware } from './middleware/session.js';
import indexRouter from './routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// in production the app sits behind a reverse proxy so the real client IP is in the x-forwarded-for header,
// so trust that 1 hop to get correct client ip, for rate limits, logs and turnstile. in development, its fine to use direct client ip.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // only get ip from one hop away, so the reverse proxy
}

// middleware
app.use(headersMiddleware); // security headers applied to every response
app.use(express.json()); // req.body parsing
app.use(express.urlencoded({ extended: false })); // express read form data submitted via a normal html form
app.use(sessionMiddleware); // attach req.userId from session cookie on every request
app.use('/html', (_req, res) => res.status(403).send('Forbidden')); // block direct access to html files, only served via protected page routes
app.use(express.static(join(__dirname, '../public'))); // serve ALL static assets from public dir, while protecting from traversing out in url eg ../../
app.use('/uploads', express.static(path.resolve('uploads'))); // serve uploaded profile pictures

// page routes and API routes
app.use('/', indexRouter);

// not found 404 page
app.use((_req, res) => res.status(404).send('404 - Page not found'));

export default app;
