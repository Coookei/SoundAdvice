import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 4000;
const __dirname = dirname(fileURLToPath(import.meta.url));

// This browser test shows that even if an attacker tricks a user into sending requests to
// our site, the attacker cannot read anything as the cross origin policies block access to the response.
// so making a cross origin request to /auth/me to try and get the CSRF token results in a blocked response.
//    SameSite=Strict on the session cookie means browser removes the session cookie from the cross origin request.
//    and then no CORS headers + Cross-origin-resource-policy: same-origin stops the attacker from even reading a response.

// Even if a forged request does have the victims sesion, without the valid CSRF token, the server rejects the request

http
  .createServer(async (_req, res) => {
    const html = await readFile(join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  })
  .listen(PORT, () => {
    console.log('attacker test page: http://localhost:' + PORT);
  });
