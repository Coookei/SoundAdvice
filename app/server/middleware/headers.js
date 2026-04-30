// strict CSP - no inline scripts/styles, no eval, only same origin plus Font Awesome CDN
// acts as defence in depth, even if our XSS sanitiser misses something the browser will refuse to run it
const CSP = [
  "default-src 'self'", // fallback - only our origin
  "script-src 'self'", // no inline JS, no external scripts
  "style-src 'self' https://cdnjs.cloudflare.com", // own CSS plus Font Awesome
  "font-src 'self' https://cdnjs.cloudflare.com", // Font Awesome icons font files
  "img-src 'self' data:", // own images plus inline data URIs
  "connect-src 'self'", // fetch/XHR only to our API
  "object-src 'none'", // block <object>, <embed>, legacy plugin attack vectors
  "base-uri 'self'", // block <base href="evil.com"> hijacking relative URLs
  "form-action 'self'", // forms can only submit to us, CSRF defence in depth
  "frame-ancestors 'none'", // CSP equivalent of X-Frame-Options DENY
].join('; ');

// sets security headers applied to every response
export function headersMiddleware(_req, res, next) {
  res.setHeader('Content-Security-Policy', CSP); // controls what the browser is allowed to load and run
  res.setHeader('X-Content-Type-Options', 'nosniff'); // prevents browsers from guessing content type, MIME sniffing attacks
  res.setHeader('X-Frame-Options', 'DENY'); // stops page being embedded in iframe, clickjacking
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // controls how much referrer info is sent when leaving the site
  res.setHeader('X-Powered-By', 'SoundAdvice'); // why not? also hides express which is good security
  next();
}
