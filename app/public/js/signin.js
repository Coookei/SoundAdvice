const form = document.getElementById('login_form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email_input').value.trim();
  const password = document.getElementById('password_input').value;

  const existing = document.getElementById('login_error');
  if (existing) existing.remove();

  if (!email || !password) {
    showError('Please fill out all fields.');
    return;
  }

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (res.ok && data.redirect) {
    window.location.href = data.redirect;
  } else {
    showError(data.error || 'Something went wrong');
  }
});

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'login_error';
  p.textContent = msg;
  p.classList.add('error');
  form.insertBefore(p, form.firstChild);
}
