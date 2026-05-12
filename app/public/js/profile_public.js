// match a trailing / that appears at end and remove it eg /user/123/, then split, then get last part of url as this is profile user id
// in regex: \ to escape the / and then $ means end of string, so replace / at end of string
const userId = window.location.pathname.replace(/\/$/, '').split('/').pop();

async function loadPublicProfile() {
  const res = await fetch('/api/users/' + userId);

  // user not found or invalid id, show errror
  if (!res.ok) {
    document.getElementById('profile_username').textContent = 'User not found';
    document.getElementById('profile_picture').classList.add('hidden');
    document.querySelector('.profile-info').classList.add('hidden');
    document.querySelector('.profile-posts').classList.add('hidden');
    return;
  }

  const { user } = await res.json();

  // profile picture, hide if not set or fails to load
  const img = document.getElementById('profile_picture');
  if (user.profile_picture) {
    img.src = user.profile_picture;
    img.onerror = () => img.classList.add('hidden');
  } else {
    img.classList.add('hidden');
  }

  document.getElementById('profile_username').textContent = user.username;
  document.getElementById('profile_joined').textContent = 'Joined: ' + new Date(user.created_at).toLocaleDateString();
  document.getElementById('profile_bio').textContent = 'Bio: ' + (user.bio || 'No bio yet');

  // now load their approved posts
  loadUserPosts();
}

async function loadUserPosts() {
  const res = await fetch('/api/posts/user/' + userId);
  if (!res.ok) return;

  const { posts } = await res.json();
  const list = document.getElementById('postsList');

  if (posts.length === 0) {
    list.innerHTML = '<p>No posts yet.</p>';
    return;
  }

  for (const post of posts) {
    // use same style as homepage for consistency
    const article = document.createElement('article');
    article.classList.add('post');

    const link = document.createElement('a');
    link.href = '/post/' + post.id;

    const title = document.createElement('h3');
    title.textContent = post.title;

    // dont need to add users name, since this is their profile page
    const meta = document.createElement('p');
    meta.textContent = new Date(post.created_at).toLocaleString('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const content = document.createElement('p');
    content.textContent = post.content;

    link.appendChild(title);
    article.appendChild(link);
    article.appendChild(meta);
    article.appendChild(content);
    list.appendChild(article);
  }
}

loadPublicProfile();
