import crypto from 'crypto';

// this file implements CSRF token checks using a token derived from the users session id

// the client gets the token from the server /auth/me endpoint on page load (so no readable cookie is needed on the client)
// our express server does not set CORS headers, so browsers block cross origin scripts from reading the response, so the token stays unreadable to other sites

// the client sends the token back in the x-csrf-token header on state changing requests, like POST requests.

export function generateCSRFToken(sid) {
  if (!sid) return null;
  // the CSRF token is obtained from hmac(sid, CSRF_SECRET), so the token is unique per session and expires when the session expires
  // additioanlly the csrf token cannot be easily forged as we are using a server side secret
  return crypto.createHmac('sha256', process.env.CSRF_SECRET).update(sid).digest('hex');
}

export function csrfProtection(req, res, next) {
  // this middleware is applied to all state changing API routes to ensure that the user
  // meant to initate the action by checking that a valid CSRF token is included in the request header
  // a cross origin script cannot read /auth/me response (no CORS headers allowed and CORP set to same-origin), so cannot obtain the token, as modern browsers enforce these policies

  // only protect unsafe API methods
  const unsafe = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!unsafe.includes(req.method)) {
    return next(); // allow other methods, eg GET requests
  }

  // check the request origin as an additional csrf defence
  // alongside the SameSite=Strict session cookie and CSRF token check we do below
  const origin = req.headers.origin;
  const host = req.headers.host;

  if (!origin) {
    return res.status(403).json({ error: 'Missing origin' });
  }

  // checks for origin
  try {
    if (new URL(origin).host !== host) {
      return res.status(403).json({ error: 'Bad origin' });
    }
  } catch {
    return res.status(403).json({ error: 'Invalid origin' });
  }

  // must have a session to verify the token against
  if (!req.sid) {
    return res.status(403).json({ error: 'No session' });
  }

  // client must send token derived from their sid in the header
  const expected = generateCSRFToken(req.sid);
  const submitted = req.headers['x-csrf-token'];

  // no token submitted
  if (!submitted) {
    return res.status(403).json({ error: 'Missing CSRF token' });
  }

  // convert hex to buffers to enable a safe timingcomparison
  const expectedBuff = Buffer.from(expected, 'hex');
  const submittedBuff = Buffer.from(submitted, 'hex');

  // timinig safe comparison, prevents timing attacks
  if (expectedBuff.length !== submittedBuff.length || !crypto.timingSafeEqual(expectedBuff, submittedBuff)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next(); // valid token so allow this request
}
