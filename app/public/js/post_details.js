async function loadPost() {
  const postId = window.location.pathname.split('/').pop();

  const response = await fetch('/json/posts.json');
  const posts = await response.json();

  const post = posts.find((p) => p.postId == postId);
  if (!post) return;

  document.getElementById('postTitle').textContent = post.title;
  document.getElementById('postAuthor').textContent = post.username;
  document.getElementById('postContent').innerHTML = '<p>' + post.content + '</p>';

  // set edit link to correct id
  document.getElementById('edit_btn').href = '/post/' + post.postId + '/edit';
}

loadPost();
