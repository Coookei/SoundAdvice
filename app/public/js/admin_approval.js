async function loadPosts() {
  const response = await fetch('/api/posts/admin'); // admin endpoint will returl ALL posts no matter what status
  const { posts } = await response.json();

  const container = document.getElementById('pendingPosts');

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    const article = document.createElement('article');
    article.classList.add('post');

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
        const res = await fetch('/api/posts/' + post.id + '/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'approved' }),
        });
        if (res.ok) {
          statusElement.textContent = 'Status: approved';
          approveButton.remove();
          rejectButton.remove();
        }
      });
      article.appendChild(approveButton);

      const rejectButton = document.createElement('button');
      rejectButton.textContent = 'Reject';
      rejectButton.classList.add('link_btn');
      rejectButton.addEventListener('click', async () => {
        const res = await fetch('/api/posts/' + post.id + '/status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' }),
        });
        if (res.ok) {
          statusElement.textContent = 'Status: rejected';
          approveButton.remove();
          rejectButton.remove();
        }
      });
      article.appendChild(rejectButton);
    }

    container.appendChild(article);
  }
}

loadPosts();
