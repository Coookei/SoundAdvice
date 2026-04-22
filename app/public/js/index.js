// load latest posts 
async function loadLatestPosts() {
  const response = await fetch('/api/posts');
  const { posts } = await response.json();

  const postList = document.getElementById('postsList');
  const newPostBtn = postList.querySelector('.link_btn').parentElement;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    // container element for each post 
    const article = document.createElement('article');
    article.classList.add('post');

    // clickable link that navigates to full post page 
    const link = document.createElement('a');
    link.href = '/post/' + post.id;

    // post title displayed as heading 
    const title = document.createElement('h3');
    title.textContent = post.title;

    // metadata showing author + timestamp 
    const meta = document.createElement('p');
    meta.textContent = 'By ' + post.username + ' - ' + new Date(post.created_at).toLocaleDateString();

    // post content 
    const content = document.createElement('p');
    content.textContent = post.content;

    // post structure
    // title inside link, metadata + content added
    link.appendChild(title);
    article.appendChild(link);
    article.appendChild(meta);
    article.appendChild(content);

    // post inserted before the 'new post' button 
    postList.insertBefore(article, newPostBtn);
  }
}

// loads latest posts
loadLatestPosts();
