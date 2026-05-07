const form = document.getElementById('signup_form');
const btn = document.getElementById('signup_btn');
let captchaToken = null;

// fetch a captcha on page load
async function loadCaptcha() {
  const res = await fetch('/api/auth/captcha');
  const data = await res.json();
  captchaToken = data.token;
  document.getElementById('captcha_word').textContent = data.scrambled.toUpperCase();
}

loadCaptcha();

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username_input').value.trim();
  const email = document.getElementById('email_input').value.trim();
  const password = document.getElementById('password_input').value;
  const confirmPassword = document.getElementById('confirm_password_input').value;
  const captchaAnswer = document.getElementById('captcha_input').value.trim();

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

  if (!captchaAnswer) {
    showError('Please solve the captcha.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Loading...';

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, captchaToken, captchaAnswer }),
  });

  const data = await res.json();

  if (res.ok) {
    setSuccessMessage('Account created. Please sign in.');
    window.location.href = '/sign-in';
  } else {
    btn.disabled = false;
    btn.textContent = 'Sign up';
    showError(data.error || 'Something went wrong');
    loadCaptcha(); // refresh captcha on failure
  }
});

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'signup_error';
  p.textContent = msg;
  p.classList.add('error');
  form.insertBefore(p, form.firstChild);
}
