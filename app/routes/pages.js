import { Router } from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = (file) => join(__dirname, "../public/html", file);

const router = Router();

router.get("/", (_req, res) => res.sendFile(html("index.html")));
router.get("/login", (_req, res) => res.sendFile(html("login.html")));
router.get("/posts", (_req, res) => res.sendFile(html("posts.html")));
router.get("/my-posts", (_req, res) => res.sendFile(html("my_posts.html")));

export default router;
