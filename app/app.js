import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import indexRouter from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(join(__dirname, "public"))); // serve static assets from public

// main router
app.use("/", indexRouter);

// error handling
app.use(errorHandler);
app.use(notFoundHandler);

export default app;
