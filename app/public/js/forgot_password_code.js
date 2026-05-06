const form = document.getElementById('code_form');
const btn = document.getElementById('verify_btn');
const email = sessionStorage.getItem('forgot_email');

if (!email) {
  window.location.href = '/forgot-password';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const code = document.getElementById('code_input').value.trim();

  const existing = document.getElementById('code_error');
  if (existing) existing.remove();

  if (!code) {
    showError('Please enter the code.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Loading...';

  const res = await fetch('/api/auth/forgot-password/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  const data = await res.json();

  if (res.ok) {
    sessionStorage.setItem('forgot_token', data.token);
    sessionStorage.removeItem('forgot_email');
    window.location.href = '/forgot-password/reset';
  } else {
    btn.disabled = false;
    btn.textContent = 'Verify';
    showError(data.error || 'Something went wrong');
  }
});

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'code_error';
  p.textContent = msg;
  p.classList.add('error');
  form.insertBefore(p, form.firstChild);
}
