async function loadPosts() {
  const response = await fetch('/api/posts/my');
  const { posts } = await response.json();

  const postList = document.getElementById('myPosts');

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    const article = document.createElement('article');
    article.classList.add('post');

    const link = document.createElement('a');
    link.href = '/post/' + post.id;

    const title = document.createElement('h3');
    title.textContent = post.title;

    link.appendChild(title);
    article.appendChild(link);

    const meta = document.createElement('p');
    meta.textContent = new Date(post.created_at).toLocaleDateString();
    article.appendChild(meta);

    const status = document.createElement('span');
    status.textContent = post.status;
    meta.appendChild(document.createTextNode(' - '));
    meta.appendChild(status);

    const content = document.createElement('p');
    content.textContent = post.content;
    article.appendChild(content);

    if (post.status !== 'rejected') {
      const editLink = document.createElement('a');
      editLink.href = '/post/' + post.id + '/edit';
      editLink.textContent = 'Edit';
      editLink.classList.add('link_btn');
      article.appendChild(editLink);
    }

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.classList.add('link_btn');
    delBtn.addEventListener('click', async () => {
      // remove error message if already existing
      const existing = document.getElementById('post_error');
      if (existing) existing.remove();

      const res = await fetch('/api/posts/' + post.id, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        article.remove();
      } else {
        showError(data.error || 'Something went wrong');
      }
    });
    article.appendChild(delBtn);

    postList.appendChild(article);
  }
}

loadPosts();

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'post_error';
  p.textContent = msg;
  p.classList.add('error');
  document.getElementById('myPosts').insertBefore(p, document.getElementById('search_icon'));
}

function searchPosts() {
  // since we have all posts as articles in the myposts section of DOM, can loop over and simply hide posts that dont match title/content
  const filter = document.getElementById('search').value.toLowerCase();
  const posts = document.getElementById('myPosts').getElementsByTagName('article');

  for (let i = 0; i < posts.length; i++) {
    const title = posts[i].getElementsByTagName('h3')[0];
    const content = posts[i].getElementsByTagName('p')[1]; // second p is the real content, 1st is data+status

    const titleText = title.textContent.toLowerCase();
    const contentText = content ? content.textContent.toLowerCase() : '';

    if (titleText.includes(filter) || contentText.includes(filter)) {
      posts[i].style.display = ''; // allow display
    } else {
      // if not match then add display none to hide
      posts[i].style.display = 'none';
    }
  }
}

document.getElementById('search').addEventListener('keyup', searchPosts); // after each key press, filter posts
