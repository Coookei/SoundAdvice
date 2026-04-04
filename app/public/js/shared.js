// Function to add username in top right corner of every page after user has logged in
async function displayUsername() {
  const response = await fetch('../json/login_attempt.json');
  const user_data = await response.json();

  document.querySelector('#login_link').textContent = user_data.username;
}

displayUsername();

// logout button will call the logout API and redirect to sign in
document.querySelector('#logout_btn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  const data = await res.json();
  window.location.href = data.redirect || '/sign-in';
});
