// content security policy is a browser enforce allowlist of what a page can load and run

// we have strict CSP config defined with only same origin js scripts allowed, no inline scripts or styles allowed, no eval, and Font Awesome CDN is allowed (but integrity checked).
// this acts as defence in depth, even if our XSS sanitiser misses something the browser will refuse to run it
const CSP = [
  "default-src 'self'", // fallback rule for any unset rule, this defaults to only our origin
  "script-src 'self' https://challenges.cloudflare.com", // only our own js files plus Cloudflare Turnstile widget, blocks inline js
  "style-src 'self' https://cdnjs.cloudflare.com", // allows our own CSS and Font Awesome CDN, but no inline styles
  "font-src 'self' https://cdnjs.cloudflare.com", // allows Font Awesome icons font files
  "img-src 'self' data:", // allows our own images plus inline data URIs
  "connect-src 'self'", // fetch/XHR only to our own API backend
  'frame-src https://challenges.cloudflare.com', // Turnstile renders its challenge inside an iframe served from Cloudflare
  "object-src 'none'", // block <object>, <embed>, legacy plugin attack vectors, these are v legacy so not used in modern sites
  "base-uri 'self'", // block <base href="evil.com"> hijacking relative URLs on a page
  "form-action 'self'", // forms can only submit to us, CSRF defence in depth
  "frame-ancestors 'none'", // CSP equivalent of X-Frame-Options DENY, this CSP is a modern replacement
].join('; ');

// sets security headers applied to every response
export function headersMiddleware(_req, res, next) {
  res.setHeader('Content-Security-Policy', CSP); // controls what the browser is allowed to load and run
  res.setHeader('X-Content-Type-Options', 'nosniff'); // prevents browsers from guessing content type, forces browser to trust Content-Type header. MIME sniffing attacks
  res.setHeader('X-Frame-Options', 'DENY'); // stops page being embedded in iframe, clickjacking, for older browsers that dont support CSP
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin'); // controls how much referrer info is sent when leaving the site, only the origin not full URL for cross origin requests
  res.setHeader('X-Powered-By', 'SoundAdvice'); // why not? also hides express which is good security
  res.setHeader('Cache-Control', 'no-store'); // disables back-forward cache so logged out users dont see stale logged in pages on browser back navigation
  next();
}
