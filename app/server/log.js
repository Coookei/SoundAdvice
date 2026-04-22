import { appendFile, mkdir } from 'fs/promises'; // use async file saving to not block
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs');
const AUTH_LOG_PATH = join(LOG_DIR, 'auth.jsonl');
const POSTS_LOG_PATH = join(LOG_DIR, 'posts.jsonl');

async function writeLog(path, entry) {
  await mkdir(LOG_DIR, { recursive: true }); // ensure /logs dir exists
  await appendFile(path, JSON.stringify(entry) + '\n');
}

export async function logAuthEvent(event, { userId = null, ip = null, detail = null } = {}) {
  const entry = {
    event,
    userId,
    ip,
    detail,
    timestamp: new Date().toISOString(),
  };

  await writeLog(AUTH_LOG_PATH, entry);
}

export async function logPostEvent(event, { userId = null, postId = null, commentId = null, detail = null } = {}) {
  const entry = {
    event,
    userId,
    postId,
    commentId,
    detail,
    timestamp: new Date().toISOString(),
  };

  await writeLog(POSTS_LOG_PATH, entry);
}
