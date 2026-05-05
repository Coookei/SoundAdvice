document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('postForm');
  const fileInput = document.getElementById('image_field'); 

  if (!form || !fileInput) {
    return; 
  }

  let currentObjectURL = null; 

  // image preview
  const previewImg = document.createElement('img');
  previewImg.classList.add('post_img');
  previewImg.style.display = 'none';

  // insert preview after file input
  fileInput.parentNode.insertBefore(previewImg, fileInput.nextSibling); 

  fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];

  // clean old preview url
  if (currentObjectURL) {
    URL.revokeObjectURL(currentObjectURL); 
    currentObjectURL = null; 
  }

  if (!file) {
    previewImg.style.display = 'none'; 
    previewImg.src = '';
    return; 
  }

  currentObjectURL = URL.createObjectURL(file);
  previewImg.src = currentObjectURL; 
  previewImg.style.display = 'block'; 
}); 

// submit form 
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

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content); 

    if (fileInput.files[0]) {
      formData.append('image', fileInput.files[0]); 
    }

    const res = await csrfFetch('/api/posts', {
    method: 'POST',
    body: formData,
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
});