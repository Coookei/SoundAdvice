const form = document.getElementById('confirm_form');
const params = new URLSearchParams(window.location.search); // get url params
const token = params.get('token') || ''; // extract token and store in variable

// after read token from the URL and stored in variable, remove it from URL so not left in browser history. as since this gives direct access to user account kinda important to not leak!
if (token) {
  window.history.replaceState({}, document.title, '/sign-in/magic-link/confirm'); // replace current history
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // remove any error messages
  const existing = document.getElementById('confirm_message');
  if (existing) existing.remove();

  // quick client side validation check before sending to server
  if (!token) {
    showMessage('Invalid or expired link, please request a new one.', 'error');
    return;
  }

  const res = await fetch('/api/auth/magic-link/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const data = await res.json();

  if (res.ok) {
    window.location.href = data.redirect || '/';
  } else {
    showMessage(data.error || 'Something went wrong', 'error');
  }
});

function showMessage(msg, kind) {
  const p = document.createElement('p');
  p.id = 'confirm_message';
  p.textContent = msg;
  p.classList.add(kind);
  form.insertBefore(p, form.firstChild);
}
