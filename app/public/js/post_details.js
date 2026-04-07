// match a / that appears at end and remove it, then get last part of url as id
// in regex: \ to escape the / and then $ means end of string, so replace / at end of string
const postId = window.location.pathname.replace(/\/$/, '').split('/').pop();

async function loadPost() {
  const res = await fetch('/api/posts/' + postId);

  if (!res.ok) {
    document.getElementById('postTitle').textContent = 'Post not found';
    document.getElementById('postMeta').style.display = 'none';
    document.getElementById('postContent').style.display = 'none';
    document.getElementById('postActions').style.display = 'none';
    document.getElementById('commentsSection').style.display = 'none';
    return;
  }

  const { post } = await res.json();

  document.getElementById('postTitle').textContent = post.title;
  document.getElementById('postAuthor').textContent = post.username;
  document.getElementById('postContent').innerHTML = '<p>' + post.content + '</p>';
  document.getElementById('edit_btn').href = '/post/' + post.id + '/edit';

  // check if the current user is the author or an admin so we can show edit/delte buttons
  const authRes = await fetch('/api/auth/me');
  const { user } = await authRes.json();

  if (user && (user.id === post.user_id || user.is_admin)) {
    document.getElementById('postActions').style.display = '';
  } else {
    document.getElementById('postActions').style.display = 'none';
  }

  // attach listener to delete button
  document.getElementById('delete_btn').addEventListener('click', async () => {
    // remove error message if already existing
    const existing = document.getElementById('post_error');
    if (existing) existing.remove();

    const deleteRes = await fetch('/api/posts/' + post.id, { method: 'DELETE' });
    const data = await deleteRes.json();

    if (deleteRes.ok) {
      window.location.href = '/';
    } else {
      showError(data.error || 'Something went wrong');
    }
  });
}

loadPost();

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'post_error';
  p.textContent = msg;
  p.classList.add('error');
  document.getElementById('postActions').insertBefore(p, document.getElementById('edit_btn'));
}
