async function loadLatestPosts() {
  const response = await fetch('/api/posts');
  const { posts } = await response.json();

  const postList = document.getElementById('postsList');
  const newPostBtn = postList.querySelector('.link_btn').parentElement;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    const article = document.createElement('article');
    article.classList.add('post');

    const link = document.createElement('a');
    link.href = '/post/' + post.id;

    const title = document.createElement('h3');
    title.textContent = post.title;

    const meta = document.createElement('p');
    meta.textContent = 'By ' + post.username + ' - ' + new Date(post.created_at).toLocaleDateString();

    const content = document.createElement('p');
    content.textContent = post.content;

    link.appendChild(title);
    article.appendChild(link);
    article.appendChild(meta);
    article.appendChild(content);

    postList.insertBefore(article, newPostBtn);
  }
}

loadLatestPosts();
