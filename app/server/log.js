import { appendFile, mkdir } from 'fs/promises'; // use async file saving to not block
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs');
const LOG_PATH = join(LOG_DIR, 'auth.jsonl');

export async function logAuthEvent(event, { userId = null, ip = null, detail = null } = {}) {
  const entry = {
    event,
    userId,
    ip,
    detail,
    timestamp: new Date().toISOString(),
  };

  // ensure logs directory exists
  await mkdir(LOG_DIR, { recursive: true });

  // append new log line
  await appendFile(LOG_PATH, JSON.stringify(entry) + '\n');
}
