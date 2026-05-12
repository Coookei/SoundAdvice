const parts = window.location.pathname.split('/');
const postId = parts[2]; // URL is ' /post/:id/edit'

const form = document.getElementById('postForm');
const imageInput = document.getElementById('image_field');
const removeImage = document.getElementById('remove_image');

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

  // theres already an image so show it, and show the remove option too
  if (post.image_path) {
    const currentImage = document.getElementById('current_image');
    currentImage.src = post.image_path;
    currentImage.classList.remove('hidden');
    document.getElementById('remove_image_label').classList.remove('hidden');
  }
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

  // form data again so we can send a new image if they picked one, browser handles the content-type
  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  if (imageInput.files[0]) {
    formData.append('image', imageInput.files[0]);
  } else if (removeImage.checked) {
    formData.append('removeImage', 'true');
  }

  const res = await csrfFetch('/api/posts/' + postId, {
    method: 'PUT',
    body: formData,
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
