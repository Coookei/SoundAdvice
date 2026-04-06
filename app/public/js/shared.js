async function displayUsernameDropdown() {

  // fetch currently authenticated user 
  const res = await fetch('/api/auth/me', {
    credentials: 'include' // ensures cookies sent with request 
  }); 
  const { user } = await res.json();

  // no user returned
  // user not logged in, show login button instead of dropdown 
  if (!user) {
    // show login button if not logged in
    document.getElementById('login_btn').style.display = '';
    return;
  }

  // show username and dropdown if logged in
  document.getElementById('user_dropdown').style.display = '';
  // update UI with username 
  document.getElementById('login_link').childNodes[0].textContent = user.username + ' ';

  // if user has admin privileges - show admin panel link 
  if (user.is_admin) {
    // only show admin panel link if user is admin
    document.getElementById('admin_panel_link').style.display = '';
  }
}

displayUsernameDropdown();

// logout button will call the logout API and redirect to sign in
document.querySelector('#logout_btn')?.addEventListener('click', async (e) => {
  e.preventDefault();

  // call logout endpoint 
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  const data = await res.json();

  // redirect to URL or sign-in page 
  window.location.href = data.redirect || '/sign-in';
});
