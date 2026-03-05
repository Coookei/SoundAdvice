import { Router } from "express";
import pageRoutes from "./pages.js";
import userRoutes from "./users.js";

const indexRouter = Router();

// HTML page routes
indexRouter.use("/", pageRoutes);

// API routes
const api = Router();
api.use("/users", userRoutes);
// can add more routes here
indexRouter.use("/api", api);

export default indexRouter;
