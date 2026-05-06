async function loadPosts() {
  const response = await fetch('/api/posts/admin'); // admin endpoint will return ALL posts no matter what status
  const { posts } = await response.json();

  const container = document.getElementById('pendingPosts');

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    const article = document.createElement('article');
    article.classList.add('post');
    article.dataset.status = post.status; // store the status on the element so filter can show/hide it

    const title = document.createElement('h3');
    const titleLink = document.createElement('a');
    titleLink.textContent = post.title;
    titleLink.href = '/post/' + post.id;
    title.appendChild(titleLink);
    article.appendChild(title);

    const meta = document.createElement('p');
    meta.textContent = 'By ' + post.username + ' - ' + new Date(post.created_at).toLocaleDateString();
    article.appendChild(meta);

    const content = document.createElement('p');
    content.textContent = post.content;
    article.appendChild(content);

    const statusElement = document.createElement('p');
    statusElement.textContent = 'Status: ' + post.status;
    article.appendChild(statusElement);

    // then add approve and reject buttons for pending posts, with e listeners
    if (post.status === 'pending') {
      const approveButton = document.createElement('button');
      approveButton.textContent = 'Approve';
      approveButton.classList.add('link_btn');
      approveButton.addEventListener('click', async () => {
        const res = await csrfFetch('/api/posts/' + post.id + '/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        });
        if (res.ok) {
          statusElement.textContent = 'Status: approved';
          article.dataset.status = 'approved'; // update post status so filter will work

          approveButton.remove();
          rejectButton.remove();

          // run filter again so posts gets in corect filter
          applyFilter();
        }
      });
      article.appendChild(approveButton);

      const rejectButton = document.createElement('button');
      rejectButton.textContent = 'Reject';
      rejectButton.classList.add('link_btn');
      rejectButton.addEventListener('click', async () => {
        const res = await csrfFetch('/api/posts/' + post.id + '/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' }),
        });
        if (res.ok) {
          statusElement.textContent = 'Status: rejected';
          article.dataset.status = 'rejected'; // update post status so filter will work

          approveButton.remove();
          rejectButton.remove();

          // run filter again so posts gets in correct filter
          applyFilter();
        }
      });
      article.appendChild(rejectButton);
    }

    container.appendChild(article);
  }

  applyFilter(); // on page load, show pending posts first
}

function applyFilter() {
  const filter = document.querySelector('.filter_btn.active').dataset.filter; // read html to find active tab

  const articles = document.querySelectorAll('#pendingPosts article');
  articles.forEach((article) => {
    // only show posts IF it has the data status that matches CURRENT FILTER, otherwise hide
    article.classList.toggle('hidden', article.dataset.status !== filter);
  });
}

// listen for clicks on the three filter buttons
document.getElementById('filterButtons').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter_btn'); // get clostest button that was clicked
  if (!btn) return;

  document.querySelectorAll('.filter_btn').forEach((b) => b.classList.remove('active')); // remove active class from all buttons
  btn.classList.add('active');
  applyFilter(); // run filtering!
});

loadPosts();
