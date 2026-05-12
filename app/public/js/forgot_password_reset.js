const form = document.getElementById('reset_form');
const token = sessionStorage.getItem('forgot_token');

if (!token) {
  window.location.href = '/forgot-password';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById('password_input').value;
  const confirm = document.getElementById('confirm_input').value;

  const existing = document.getElementById('reset_error');
  if (existing) existing.remove();

  if (!newPassword || !confirm) {
    showError('Please fill out both fields.');
    return;
  }

  if (newPassword !== confirm) {
    showError('Passwords do not match.');
    return;
  }

  const res = await fetch('/api/auth/forgot-password/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  const data = await res.json();

  if (res.ok) {
    sessionStorage.removeItem('forgot_token');
    setSuccessMessage('Password updated. Please sign in.');
    window.location.href = data.redirect || '/sign-in';
  } else {
    showError(data.error || 'Something went wrong');
  }
});

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'reset_error';
  p.textContent = msg;
  p.classList.add('error');
  form.insertBefore(p, form.firstChild);
}
