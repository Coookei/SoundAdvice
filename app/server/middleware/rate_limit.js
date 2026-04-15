// reusable rate limiter, apply to any route with different config and independent tracking per route
export function rateLimit({ max = 5, windowMs = 10 * 60 * 1000, blockMs = 15 * 60 * 1000 } = {}) {
  const store = new Map();

  // cleanup expired entries every 10 mins
  setInterval(
    () => {
      const now = Date.now();
      for (const [ip, entry] of store) {
        if (now > entry.resetAt && (!entry.blockedUntil || now > entry.blockedUntil)) {
          store.delete(ip);
        }
      }
    },
    10 * 60 * 1000
  ).unref(); // .unref() means timer wont keep the node process alive on shutdown. this stop test runs hanging indefinitely

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const entry = store.get(ip);

    if (entry?.blockedUntil && now < entry.blockedUntil) {
      const retryIn = Math.ceil((entry.blockedUntil - now) / 1000);
      return res.status(429).json({ error: `Too many attempts, try again in ${retryIn}s` });
    }

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs, blockedUntil: null });
      return next();
    }

    entry.count++;

    if (entry.count > max) {
      entry.blockedUntil = now + blockMs;
      return res.status(429).json({ error: 'Too many attempts, please try again later' });
    }

    next();
  };
}
