export function requireSameOrigin(req, res, next) {
  // used to check that requests, came from OUR WEBSITE
  const unsafe = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (!unsafe.includes(req.method)) {
    return next(); // safe methods dont need origin check
  }

  const origin = req.headers.origin; // website sending the request
  const host = req.headers.host; // our website receiving the request

  if (!origin) {
    return res.status(403).json({ error: 'Missing origin' });
  }

  try {
    // if the site that sent the request isnt our site block it. this prevents CSRF in browsers, as modern browsers respect this policy
    if (new URL(origin).host !== host) {
      return res.status(403).json({ error: 'Bad origin' });
    }
  } catch {
    return res.status(403).json({ error: 'Invalid origin' });
  }

  next(); // origin is valid, allow request
}
