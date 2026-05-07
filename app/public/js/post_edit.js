const parts = window.location.pathname.split('/');
const postId = parts[2]; // URL is ' /post/:id/edit'

const form = document.getElementById('editForm');

async function loadPost() {
  const res = await fetch('/api/posts/' + postId);

  if (!res.ok) {
    showError('Could not load post.');
    form.classList.add('hidden');
    return;
  }

  const { post } = await res.json();

  document.getElementById('postId').value = post.id;
  document.getElementById('title_field').value = post.title;
  document.getElementById('content_field').value = post.content;
  document.getElementById('cancel_link').href = '/post/' + post.id;
}

loadPost();

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('title_field').value.trim();
  const content = document.getElementById('content_field').value.trim();

  const existing = document.getElementById('edit_error');
  if (existing) existing.remove();

  if (!title || !content) {
    showError('Please fill out all fields.');
    return;
  }

  const res = await csrfFetch('/api/posts/' + postId, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });

  const data = await res.json();

  if (res.ok) {
    setSuccessMessage('Post updated. It has been resubmitted for approval.');
    window.location.href = '/post/' + postId;
  } else {
    showError(data.error || 'Something went wrong');
  }
});

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'edit_error';
  p.textContent = msg;
  p.classList.add('error');
  form.parentNode.insertBefore(p, form);
}
