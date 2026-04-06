async function displayUsernameDropdown() {
  const res = await fetch('/api/auth/me');
  const { user } = await res.json();

  if (!user) {
    // show login button if not logged in
    document.getElementById('login_btn').style.display = '';
    return;
  }

  // show username and dropdown if logged in
  document.getElementById('user_dropdown').style.display = '';
  document.getElementById('login_link').childNodes[0].textContent = user.username + ' ';

  if (user.is_admin) {
    // only show admin panel link if user is admin
    document.getElementById('admin_panel_link').style.display = '';
  }
}

displayUsernameDropdown();

// logout button will call the logout API and redirect to sign in
document.querySelector('#logout_btn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  const data = await res.json();
  window.location.href = data.redirect || '/sign-in';
});
