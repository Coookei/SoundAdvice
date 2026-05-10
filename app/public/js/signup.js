const form = document.getElementById('signup_form');
const btn = document.getElementById('signup_btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username_input').value.trim();
  const email = document.getElementById('email_input').value.trim();
  const password = document.getElementById('password_input').value;
  const confirmPassword = document.getElementById('confirm_password_input').value;

  // Turnstile injects a hidden input named cf-turnstile-response inside the widget div.
  // its value is the one-time token Cloudflare gives us once the user passes the challenge.
  const turnstileToken = form.querySelector('[name="cf-turnstile-response"]')?.value || '';

  const existing = document.getElementById('signup_error');
  if (existing) existing.remove();

  if (!username || !email || !password) {
    showError('Please fill out all fields.');
    return;
  }

  if (password !== confirmPassword) {
    showError('Passwords do not match.');
    return;
  }

  if (!turnstileToken) {
    showError('Please complete the security check.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Loading...';

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, turnstileToken }),
  });

  const data = await res.json();

  if (res.ok) {
    setSuccessMessage('Account created. Please sign in.');
    window.location.href = '/sign-in';
  } else {
    btn.disabled = false;
    btn.textContent = 'Sign up';
    showError(data.error || 'Something went wrong');
    // reset Turnstile so the user can solve a new challenge
    if (window.turnstile) window.turnstile.reset();
  }
});

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'signup_error';
  p.textContent = msg;
  p.classList.add('error');
  form.insertBefore(p, form.firstChild);
}
