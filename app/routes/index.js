import { Router } from "express";
import { errorHandler, notFoundHandler } from "../middleware/error.js";
import pageRoutes from "./pages.js";
import userRoutes from "./users.js";

const indexRouter = Router();

// HTML page routes to serve with clean URLs
indexRouter.use("/", pageRoutes);

// API routes
const api = Router();
api.use("/users", userRoutes);
// TODO add future routes here

// API error handling
api.use(notFoundHandler);
api.use(errorHandler);
indexRouter.use("/api", api);

export default indexRouter;
