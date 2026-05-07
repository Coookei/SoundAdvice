async function loadProfile() {
  // get currently logged in user from session
  const meRes = await fetch('/api/auth/me');
  const meData = await meRes.json();

  // if user not logged in, redirected to sign-in page
  if (!meRes.ok) {
    window.location.href = '/sign-in';
    return;
  }

  // extract user data
  const user = meData.user;
  const userId = user.id;

  // set profile picture, show no profile set message if not set or fails to load
  const img = document.getElementById('profile_picture');
  const noPfpMessage = document.getElementById('no_pfp_message');
  if (user.profile_picture) {
    img.src = user.profile_picture;

    // prevents broken image display
    img.onerror = () => {
      // hide image and show no profile picture message
      img.classList.add('hidden');
      noPfpMessage.classList.remove('hidden');
    };
  } else {
    img.classList.add('hidden');
    noPfpMessage.classList.remove('hidden');
  }

  // set profile info in UI
  document.getElementById('profile_username').textContent = 'Welcome ' + user.username + '!';
  document.getElementById('profile_email').textContent = 'Email: ' + user.email;
  document.getElementById('profile_joined').textContent = 'Joined: ' + new Date(user.created_at).toLocaleDateString(); // date profile joined, converted to correct timezone based on language settings
  document.getElementById('profile_bio').textContent = 'Bio: ' + (user.bio || 'No bio yet');
}

// load user info and update the UI on page load
loadProfile();

// upload profile pic
document.getElementById('upload_pfp_btn').addEventListener('click', async () => {
  const fileInput = document.getElementById('pfp_input');
  const file = fileInput.files[0];

  // ensure file selected
  if (!file) return alert('Select an image');

  // prepare form data for upload
  const formData = new FormData();
  formData.append('pfp', file);

  // send file to backend endpoint
  const res = await csrfFetch('/api/users/upload-pfp', {
    method: 'POST',
    body: formData,
  });

  // reload page if upload reflects profile picture
  if (res.ok) {
    setSuccessMessage('Profile picture updated.');
    location.reload();
  } else {
    alert('Failed to upload profile picture');
  }
});

// update bio
document.getElementById('save_bio_btn').addEventListener('click', async () => {
  const bio = document.getElementById('bio_input').value;

  if (!bio) return alert('Enter a bio');

  // send updated bio as json
  const res = await csrfFetch('/api/users/bio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bio }),
  });

  // reload page if bio upload successful
  if (res.ok) {
    setSuccessMessage('Bio updated.');
    location.reload();
  } else alert('Failed to update bio');
});

// password change, step 1: send email code
document.getElementById('request_password_btn').addEventListener('click', async () => {
  const currentPassword = document.getElementById('current_password').value;
  const newPassword = document.getElementById('new_password').value;

  if (!currentPassword || !newPassword) return alert('Enter both current and new passwords');

  // request verification code from server
  const res = await csrfFetch('/api/users/password/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await res.json();

  if (res.ok) {
    alert('Code sent to your email.');
    // show input field for verification code
    document.getElementById('password_code_row').classList.remove('hidden');
  } else {
    alert(data.error || 'Failed to send code');
  }
});

// password change, step 2: confirm with code
document.getElementById('confirm_password_btn').addEventListener('click', async () => {
  const code = document.getElementById('password_code').value;

  // send verification code to confirm password change
  const res = await csrfFetch('/api/users/password/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  const data = await res.json();

  if (res.ok) {
    setSuccessMessage('Password updated. Other sessions have been signed out.');
    location.reload();
  } else {
    alert(data.error || 'Failed to update password');
  }
});
