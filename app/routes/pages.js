import { Router } from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = (file) => join(__dirname, "../public/html", file);

const router = Router();

router.get("/", (req, res) => {
  res.sendFile(html("index.html"));
});

// can add more pages here
export default router;
