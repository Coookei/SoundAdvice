// load latest posts 
async function loadLatestPosts() {
  // fetches data from posts.json 
  const response = await fetch('/json/posts.json');
  const posts = await response.json();

  const postList = document.getElementById('postsList');
  const newPostBtn = postList.querySelector('.link_btn').parentElement;

  // loop through posts in reverse order - newest posts appear first 
  for (let i = posts.length - 1; i >= 0; i--) {
    const post = posts[i];

    // container element for each post 
    const article = document.createElement('article');
    article.classList.add('post');

    // clickable link that navigates to full post page 
    const link = document.createElement('a');
    link.href = '/post/' + post.postId;

    // post title displayed as heading 
    const title = document.createElement('h3');
    title.textContent = post.title;

    // metadata showing author + timestamp 
    const meta = document.createElement('p');
    meta.textContent = 'By ' + post.username + ' - ' + post.timestamp;

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
