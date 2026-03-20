async function loadPostForEditing() {
  const parts = window.location.pathname.split('/');
  const postId = parts[parts.length - 2]; // 2nd last part is the postId

  const response = await fetch('/json/posts.json');
  const posts = await response.json();

  const post = posts.find((p) => p.postId == postId);
  if (!post) return;

  document.getElementById('postId').value = post.postId;
  document.getElementById('title_field').value = post.title;
  document.getElementById('content_field').value = post.content;

  document.getElementById('cancel_link').href = '/post/' + post.postId;
}

loadPostForEditing();
