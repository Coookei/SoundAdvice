// sets security headers applied to every response
export function headersMiddleware(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff'); // prevents browsers from guessing content type, MIME sniffing attacks
  res.setHeader('X-Frame-Options', 'DENY'); // stops page being embedded in iframe, clickjacking
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // controls how much referrer info is sent when leaving the site
  res.setHeader('X-Powered-By', 'SoundAdvice'); // why not? also hides express which is good security
  next();
}
