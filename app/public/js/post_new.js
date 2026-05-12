const form = document.getElementById('postForm');
const imageInput = document.getElementById('image_field');

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

  // use form data so we can send the image along with the title and content
  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  if (imageInput.files[0]) {
    formData.append('image', imageInput.files[0]);
  }

  // dont set a content-type header, the browser does that for us when the body is form data
  const res = await csrfFetch('/api/posts', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (res.ok) {
    setSuccessMessage('Post submitted for approval.');
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
