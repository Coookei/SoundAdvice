const form = document.getElementById('magic_link_form');
const btn = document.getElementById('send_link_btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email_input').value.trim();

  // remove any existing success or error message
  const existing = document.getElementById('magic_link_message');
  if (existing) existing.remove();

  // basic client side validation
  if (!email) {
    showMessage('Please enter your email.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Loading...';

  const res = await fetch('/api/auth/magic-link/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();

  btn.disabled = false;
  btn.textContent = 'Send Link';

  if (res.ok) {
    // server will always return same generic message whether the email matched or not
    showMessage(data.message, 'success');
    form.reset();
  } else {
    showMessage(data.error || 'Something went wrong', 'error');
  }
});

function showMessage(msg, kind) {
  const p = document.createElement('p');
  p.id = 'magic_link_message';
  p.textContent = msg;
  p.classList.add(kind);

  form.insertBefore(p, form.lastElementChild);
}
