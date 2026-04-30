let csrfToken = null; // stores the CSRF token obtained from the server

const authReady = loadAuthState(); // fetch current user immediately

async function loadAuthState() {
  // fetches currently authenticated user and csrf token
  const res = await fetch('/api/auth/me');
  const { user, csrfToken: token } = await res.json();
  csrfToken = token;
  return user;
}

async function displayUsernameDropdown() {
  const user = await authReady;

  // user not logged in, show login button instead of dropdown
  if (!user) {
    // show login button if not logged in
    document.getElementById('login_btn').classList.remove('hidden');
    return;
  }

  // show username and dropdown if logged in
  document.getElementById('user_dropdown').classList.remove('hidden');
  // update UI with username
  document.getElementById('login_link').childNodes[0].textContent = user.username + ' ';

  // if user has admin privileges - show admin panel link
  if (user.is_admin) {
    // only show admin panel link if user is admin
    document.getElementById('admin_panel_link').classList.remove('hidden');
  }
}

displayUsernameDropdown();

// logout button will call the logout API and redirect to sign in
document.querySelector('#logout_btn')?.addEventListener('click', async (e) => {
  e.preventDefault();

  // call logout endpoint
  const res = await csrfFetch('/api/auth/logout', { method: 'POST' });
  const data = await res.json();

  // redirect to URL or sign-in page
  window.location.href = data.redirect || '/sign-in';
});

async function csrfFetch(url, options = {}) {
  // helper to include the CSRF token in fetch requests as a header
  await authReady; // make sure token loaded

  return fetch(url, {
    ...options, // include any options passed in
    headers: {
      ...options.headers, // keep any existing headers
      'x-csrf-token': csrfToken, // attach csrf token as custom header, server will verify this
    },
  });
}
