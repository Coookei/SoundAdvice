import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import indexRouter from './routes/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(join(__dirname, '../public'))); // serve ALL static assets from public dir

// page routes and API routes
app.use('/', indexRouter);

// not found page
app.use((_req, res) => res.status(404).send('404 - Page not found'));

export default app;
