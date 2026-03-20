async function loadLatestPosts() {
  const response = await fetch('/json/posts.json');
  const posts = await response.json();

  const postList = document.getElementById('postsList');
  const newPostBtn = postList.querySelector('.link_btn').parentElement;

  for (let i = posts.length - 1; i >= 0; i--) {
    const post = posts[i];

    const article = document.createElement('article');
    article.classList.add('post');

    const link = document.createElement('a');
    link.href = '/post/' + post.postId;

    const title = document.createElement('h3');
    title.textContent = post.title;

    const meta = document.createElement('p');
    meta.textContent = 'By ' + post.username + ' - ' + post.timestamp;

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
