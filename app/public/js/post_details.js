// match a / that appears at end and remove it, then get last part of url as id
// in regex: \ to escape the / and then $ means end of string, so replace / at end of string
const postId = window.location.pathname.replace(/\/$/, '').split('/').pop();

let currentUser = null; // store user so loadComments can use without another api call

async function loadPost() {
  const res = await fetch('/api/posts/' + postId);

  if (!res.ok) {
    // if post not found or error, show post not found message and hide all other bits from page
    document.getElementById('postTitle').textContent = 'Post not found';
    document.getElementById('postMeta').style.display = 'none';
    document.getElementById('postContent').style.display = 'none';
    document.getElementById('postActions').style.display = 'none';
    document.getElementById('commentsSection').style.display = 'none';
    return;
  }

  const { post } = await res.json();

  document.getElementById('postTitle').textContent = post.title;
  document.getElementById('postAuthor').textContent = post.username;
  document.getElementById('postContent').innerHTML = '<p>' + post.content + '</p>';

  if (post.status === 'pending' || post.status === 'rejected') {
    const statusElement = document.getElementById('postStatus');
    statusElement.textContent = 'Status: ' + post.status;
    statusElement.style.display = '';
  }
  document.getElementById('edit_btn').href = '/post/' + post.id + '/edit';

  // check if the current user is the author or an admin so we can show edit/delte buttons
  const authRes = await fetch('/api/auth/me');
  const { user } = await authRes.json();
  currentUser = user; // after loading user first time store on client so can reuse

  if (user && (user.id === post.user_id || user.is_admin)) {
    document.getElementById('postActions').style.display = '';
    if (post.status === 'rejected' && !user.is_admin) {
      // only admins can edit rejected posts, so hide edit button here
      document.getElementById('edit_btn').style.display = 'none';
    }
  } else {
    document.getElementById('postActions').style.display = 'none';
  }

  // attach listener to delete button
  document.getElementById('delete_btn').addEventListener('click', async () => {
    // remove error message if already existing
    const existing = document.getElementById('post_error');
    if (existing) existing.remove();

    const deleteRes = await fetch('/api/posts/' + post.id, { method: 'DELETE' });
    const data = await deleteRes.json();

    if (deleteRes.ok) {
      window.location.href = '/';
    } else {
      showError(data.error || 'Something went wrong');
    }
  });

  loadComments(); // fetch comments from backend

  // decide what to show for comment form based on auth and post status
  if (!user) {
    document.getElementById('loginToComment').style.display = ''; // show the login prommpt as guest
  } else if (post.status === 'approved') {
    document.getElementById('commentForm').style.display = ''; // as logged in and post approved, show comment form
  }
  // if user logged in but the post in not approved, then comment form stays hidden as cant leave comments when pending/rejected

  // listen to submit on the comment form
  document.getElementById('commentForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // clear any previous comment error messages so only ever 1 error message max shown
    const existing = document.getElementById('comment_error');
    if (existing) existing.remove();

    // read text content of the comment and do some basic client-side validation
    const content = document.getElementById('comment_field').value.trim();
    if (!content) {
      showCommentError('Comment cannot be empty');
      return;
    }

    // send request to api
    const commentRes = await fetch('/api/posts/' + postId + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    const data = await commentRes.json();

    if (commentRes.ok) {
      document.getElementById('comment_field').value = ''; // clear comment field
      loadComments(); // refetch comments to ensure up to date with backend
    } else {
      // render errors like rate limiting or val errors
      showCommentError(data.error || 'Something went wrong');
    }
  });
}

async function loadComments() {
  const res = await fetch('/api/posts/' + postId + '/comments');
  if (!res.ok) return;

  const { comments } = await res.json();

  const list = document.getElementById('commentsList');
  list.innerHTML = ''; // clear any existing

  if (comments.length === 0) {
    list.innerHTML = '<p>No comments yet.</p>';
    return;
  }

  for (const comment of comments) {
    // create each comment in the DOM
    const div = document.createElement('div');
    div.className = 'comment';

    const meta = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = comment.username;
    const small = document.createElement('small');
    small.textContent = ' ' + new Date(comment.created_at).toLocaleDateString();
    meta.appendChild(strong);
    meta.appendChild(small);
    div.appendChild(meta);

    const text = document.createElement('p');
    text.textContent = comment.content;
    div.appendChild(text);

    // show delete button if current user is comment author or admin
    if (currentUser && (currentUser.id === comment.user_id || currentUser.is_admin)) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'comment-delete-btn';

      // connect delete button to a listener to send the actual delete requests
      delBtn.addEventListener('click', async () => {
        const delRes = await fetch('/api/posts/' + postId + '/comments/' + comment.id, {
          method: 'DELETE',
        });

        // clear any previous error like rate limiting, so only 1 mesage shown at a time
        const existing = document.getElementById('comment_error');
        if (existing) existing.remove();

        const data = await delRes.json();

        if (delRes.ok) {
          loadComments(); // success, so refetch comments
        } else {
          showCommentError(data.error || 'Something went wrong'); // show error like rate limiting
        }
      });
      div.appendChild(delBtn);
    }

    list.appendChild(div);
  }
}

loadPost();

function showError(msg) {
  const p = document.createElement('p');
  p.id = 'post_error';
  p.textContent = msg;
  p.classList.add('error');
  document.getElementById('postActions').insertBefore(p, document.getElementById('edit_btn'));
}

function showCommentError(msg) {
  const p = document.createElement('p');
  p.id = 'comment_error';
  p.textContent = msg;
  p.classList.add('error');
  document.getElementById('commentForm').prepend(p);
}
