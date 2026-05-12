// verifies a Cloudflare Turnstile token by sending it back to Cloudflare with our secret key.
// Cloudflare responds with success: true/false based on whether the token is valid and recent
// and was issued for our site key. the token is onetime use and short lived (5 mins).

export async function verifyTurnstile(token, ip) {
  if (!token) {
    return false;
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY,
    response: token,
  });

  if (ip) {
    body.append('remoteip', ip); // optional, lets Cloudflare check the client IP
  }

  // network errors are not caught here, the controller will catch them and give user an appropriate service unavaiable message as appropriate, for usability
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  });

  const data = await res.json();

  return data.success === true;
}
