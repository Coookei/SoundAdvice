const form = document.getElementById('login_form');
const btn = document.getElementById('login_btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email_input').value.trim();
  const password = document.getElementById('password_input').value;
  // Turnstile injects a hidden input named cf-turnstile-response, its value is the one-time token from Cloudflare
  const turnstileToken = form.querySelector('[name="cf-turnstile-response"]')?.value || '';

  const existing = document.getElementById('login_error');
  if (existing) existing.remove();

  if (!email || !password) {
    showError('Please fill out all fields.');
    return;
  }

  if (!turnstileToken) {
    showError('Please complete the security check.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Loading...';

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, turnstileToken }),
  });

  const data = await res.json();

  if (res.ok && data.redirect) {
    if (data.redirect === '/sign-in/2fa') {
      // admins are sent to the 2fa page
      setSuccessMessage('Enter the code we just emailed you.');
    } else {
      // everyone else goes to home page
      setSuccessMessage('Welcome back!');
    }
    window.location.href = data.redirect;
  } else {
    btn.disabled = false;
    btn.textContent = 'Log in';
    showError(data.error || 'Something went wrong');
    // reset Turnstile so the user can solve a new challenge
    if (window.turnstile) window.turnstile.reset();
  }
});

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'login_error';
  p.textContent = msg;
  p.classList.add('error');
  form.insertBefore(p, form.firstChild);
}
