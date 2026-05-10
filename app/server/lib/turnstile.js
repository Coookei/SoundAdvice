// verifies a Cloudflare Turnstile token by sending it back to Cloudflare with our secret key.
// Cloudflare responds with success: true/false based on whether the token is valid, recent,
// and was issued for our site key. the token is one-time use and short-lived (5 mins).

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token, ip) {
  if (!token) return false;

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
  });
  if (ip) body.append('remoteip', ip); // optional, lets Cloudflare cross check the client IP

  const res = await fetch(VERIFY_URL, { method: 'POST', body });
  const data = await res.json();
  return data.success === true;
}
