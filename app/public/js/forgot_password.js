const form = document.getElementById('forgot_form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email_input').value.trim();

  const existing = document.getElementById('forgot_error');
  if (existing) existing.remove();

  if (!email) {
    showError('Please enter your email.');
    return;
  }

  const res = await fetch('/api/auth/forgot-password/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  if (res.ok) {
    sessionStorage.setItem('forgot_email', email);
    window.location.href = '/forgot-password/code';
  } else {
    showError(data.error || 'Something went wrong');
  }
});

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'forgot_error';
  p.textContent = msg;
  p.classList.add('error');
  form.insertBefore(p, form.firstChild);
}
