import crypto from 'crypto';

// parse cookies manually, from header into request cookies
export function parseCookies(req, _res, next) {
  req.cookies = {};

  const header = req.headers.cookie;

  // no cookies
  if (!header) {
    return next();
  }

  // split cookie string + extract key value pairs
  header.split(';').forEach((cookie) => {
    try {
      const [name, ...rest] = cookie.trim().split('=');
      req.cookies[name] = decodeURIComponent(rest.join('='));
    } catch (err) {
      // skip malformed cookies
    }
  });

  next();
}

// attach csrf token cookie if one doesn't already exist
export function attachCSRFCookie(req, res, next) {
  if (!req.cookies?.csrf_token) {
    // generates secure token
    const token = crypto.randomBytes(32).toString('hex');

    // sends token as cookie
    res.cookie('csrf_token', token, {
      httpOnly: false, // needs to be false, so it can be read by clientside JS
      secure: process.env.NODE_ENV === 'production', // Use Secure cookies in production to ensure the cookie is only sent over HTTPS
      sameSite: 'lax', // sends cookie for normal site use and external links, but blocks most cross-site requests
      path: '/', // cookie available across whole site
    });
  }
  next();
}

// csrf protection
export function csrfProtection(req, res, next) {
  // only protect unsafe methods
  const unsafe = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (!unsafe.includes(req.method)) {
    return next();
  }

  // check request origin matches server host
  const origin = req.headers.origin;
  const host = req.headers.host;

  // no origin
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

  // double submit cookie check
  // client must send CSRF token in both cookie and header
  const cookieToken = req.cookies?.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  // tokens don't match
  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  // convert hex to buffers, safe comparison
  const cookieBuff = Buffer.from(cookieToken, 'hex');
  const headerBuff = Buffer.from(headerToken, 'hex');

  // timinig safe comparison, prevents timing attacks
  if (cookieBuff.length !== headerBuff.length || !crypto.timingSafeEqual(cookieBuff, headerBuff)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  // valid token so allow new request
  next();
}
