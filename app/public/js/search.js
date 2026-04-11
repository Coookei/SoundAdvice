async function loadSearchResults() {
  // extract the query from URL parameters
  const params = new URLSearchParams(window.location.search); // get ? followed by params
  const query = params.get('q'); // we need the q param

  const heading = document.getElementById('searchHeading');

  if (!query || !query.trim()) {
    // if no query or query is empty after removing whitespace then exit
    heading.textContent = 'Please enter a search query.';
    return;
  }

  // we showing query back to user so can demonstrate protecting against reflected XSS
  heading.innerHTML = "Showing results for: '" + query + "'";

  const response = await fetch('/api/posts/search?q=' + encodeURIComponent(query)); // need to convert special characters so doesnt break URL, eg space converted to %20
  const { posts } = await response.json(); // search api returns an array of posts so desctrucutre here

  const section = document.getElementById('searchResults');

  if (posts.length === 0) {
    // if no posts simply show no posts message and exit
    const msg = document.createElement('p');
    msg.textContent = 'No posts found.';
    section.appendChild(msg);
    return;
  }

  for (let i = 0; i < posts.length; i++) {
    // we have posts so loop other and create an article element for each
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

    section.appendChild(article);
  }
}

loadSearchResults();
