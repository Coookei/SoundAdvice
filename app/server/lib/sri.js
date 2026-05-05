// Subresource Integrity for our own scripts. on server start we hash every file in
// /public/js/, then inject the hashes into <script> tags as we serve HTML pages.
// the browser refuses to run a script whose response bytes don't match our recorded
// hash, so an attacker who modifies a JS file on disk or in transit gets blocked.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const JS_DIR = path.resolve('app/public/js');

// in dev we recompute on every request so editing a JS file doesn't break the page.
// in production we hash once at startup for speed and to lock down the served content.
const isDev = process.env.NODE_ENV !== 'production';

function computeHashes() {
  const map = {};
  for (const file of fs.readdirSync(JS_DIR)) {
    if (!file.endsWith('.js')) continue;
    const buffer = fs.readFileSync(path.join(JS_DIR, file));
    const digest = crypto.createHash('sha384').update(buffer).digest('base64');
    map[`/js/${file}`] = `sha384-${digest}`;
  }
  return map;
}

const cachedHashes = computeHashes();

// replace <script src="/js/X.js" defer></script> with the same tag plus integrity="..."
export function injectIntegrity(html) {
  const hashes = isDev ? computeHashes() : cachedHashes;
  return html.replace(/<script\s+src="(\/js\/[^"]+)"\s+defer><\/script>/g, (match, src) => {
    const hash = hashes[src];
    if (!hash) return match;
    return `<script src="${src}" integrity="${hash}" defer></script>`;
  });
}
