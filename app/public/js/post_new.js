const form = document.getElementById('postForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('title_field').value.trim();
  const content = document.getElementById('content_field').value.trim();

  const existing = document.getElementById('post_error');
  if (existing) existing.remove();

  if (!title || !content) {
    showError('Please fill out all fields.');
    return;
  }

  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });

  const data = await res.json();

  if (res.ok) {
    window.location.href = '/my-posts';
  } else {
    showError(data.error || 'Something went wrong');
  }
});

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'post_error';
  p.textContent = msg;
  p.classList.add('error');
  form.insertBefore(p, form.firstChild);
}
