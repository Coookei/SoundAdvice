const form = document.getElementById('twofa_form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const code = document.getElementById('code_input').value.trim();

  const existing = document.getElementById('twofa_error');
  if (existing) existing.remove();

  if (!code) {
    showError('Please enter the code.');
    return;
  }

  const res = await fetch('/api/auth/verify-2fa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
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
  p.id = 'twofa_error';
  p.textContent = msg;
  p.classList.add('error');
  form.insertBefore(p, form.firstChild);
}
