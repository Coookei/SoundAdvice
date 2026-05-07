let csrfToken = null; // stores the CSRF token obtained from the server

const authReady = loadAuthState(); // fetch current user immediately

async function loadAuthState() {
  // fetches currently authenticated user and csrf token
  const res = await fetch('/api/auth/me');
  const { user, csrfToken: token } = await res.json();
  csrfToken = token;
  return user;
}

// if user loggedin, show username in dropdown, if admin show admin panel link, if not logged in, show sign in button
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

// logout button will call the logout API and redirect to sign in
document.querySelector('#logout_btn')?.addEventListener('click', async (e) => {
  e.preventDefault();

  // call logout endpoint
  const res = await csrfFetch('/api/auth/logout', { method: 'POST' });
  const data = await res.json();

  // show a logged out message, after the redirect, for usability
  setSuccessMessage('You have been logged out.');

  // redirect to URL or sign in page
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

// this function is used to save a success message in session storage so that it can be show to a user after redirect
function setSuccessMessage(message) {
  sessionStorage.setItem('success_message', message);
}

// this functino checks to see if there is a waiting success message in session storage,
// if there is it will render a green banner, and then remove it after a couple seconds
function showSuccessMessage() {
  const message = sessionStorage.getItem('success_message'); // check if message waiting

  if (!message) return; // if no message, exit

  sessionStorage.removeItem('success_message'); // clear straight away so refreshing doesnt show message again

  // make the banner element
  const successElement = document.createElement('div');
  successElement.className = 'success'; // class to render it in green
  successElement.textContent = message;

  // add it above main element, right under the nav
  const mainElement = document.querySelector('main');
  mainElement.parentNode.insertBefore(successElement, mainElement);

  // after 4 seconds remove the success message
  setTimeout(() => {
    successElement.remove();
  }, 4000);
}

// some pages dont have the dropdown menu eg signin page, so only run when its on the page
if (document.getElementById('user_dropdown')) {
  displayUsernameDropdown();
}

showSuccessMessage(); // check for success messages on every page load
