// profile page logic

// load users profile 
async function loadProfile() {
    try {
        // get currently logged in user from session
        const meRes = await fetch('/api/users/me');
        const meData = await meRes.json();

        // if user not logged in, redirected to sign-in page 
        if (!meRes.ok) {
            window.location.href = '/sign-in';
            return; 
        }

        // extract user data 
        const user = meData.user;
        const userId = user.id; 

        // set profile picture, hide if none or fails to load
        const img = document.getElementById('profile_picture');
        if (user.profile_picture) {
            img.src = user.profile_picture;
            img.onerror = () => { img.style.display = 'none'; };
        } else {
            img.style.display = 'none';
        }

        // load profile info 
        document.getElementById('profile_username').textContent = user.username;
        document.getElementById('profile_email').textContent = user.email;
        document.getElementById('profile_joined').textContent = 'Joined: ' + new Date(user.created_at).toLocaleDateString(); // date profile joined, converted to correct timezone based on language settings 
        document.getElementById('profile_bio').textContent = user.bio || 'No bio yet'; 

        // fetch posts - uses user id to query posts 
        const postRes = await fetch(`/api/posts/user/${userId}`);
        const postData = await postRes.json();

        // render posts 
        renderPosts(postData.posts || []);
    } catch(err) {
        console.log(err); 
    }
}

// render list of posts 
function renderPosts(posts) {
    // container to hold all posts 
    const container = document.getElementById('posts_container');
    container.innerHTML = ''; // existing content cleared before rendering  

    // message if no posts yet 
    if (posts.length == 0) {
        container.innerHTML = '<p> No posts yet </p>'; 
        return;
    }

    // loop through each post + create elements dynamically 
    posts.forEach(post => {
        // container for each post 
        const div = document.createElement('div'); 
        div.classList.add('post-card'); 

        // post title 
        const title = document.createElement('div');
        title.classList.add('post-title');
        title.textContent = post.title;

        // post metadata - creation date 
        const meta = document.createElement('div');
        meta.classList.add('post-meta');
        meta.textContent = new Date(post.created_at).toLocaleString();

        // post content 
        const content = document.createElement('p');
        content.textContent = post.content; 

        // add elements into post card 
        div.appendChild(title);
        div.appendChild(meta);
        div.appendChild(content);

        container.appendChild(div); 
    });
}

// initialise profile
loadProfile(); 

// profile actions - upload profile pic
document.getElementById('upload_pfp_btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('pfp_input');
    const file = fileInput.files[0];

    // ensure file selected 
    if (!file) return alert ('Select an image');

    // prepare form data for upload
    const formData = new FormData();
    formData.append('pfp', file);

    // send file to backend endpoint
    const res = await fetch('/api/users/upload-pfp', {
        method: 'POST',
        body: formData
    });

    // reload page if upload reflects profile picture 
    if (res.ok) {
        location.reload();
    } else {
        alert('Failed to upload profile picture');
    }
});

// update bio
document.getElementById('save_bio_btn').addEventListener('click', async () => {
    const bio = document.getElementById('bio_input').value;

    // send updated bio as json 
    const res = await fetch('/api/users/bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio })
    });

    // reload page if bio upload successful 
    if (res.ok) location.reload();
    else alert('Failed to update bio');
});

// update password
document.getElementById('update_password_btn').addEventListener('click', async () => {

    // get user input values 
    const currentPassword = document.getElementById('current_password').value;
    const newPassword = document.getElementById('new_password').value; 

    // send password update request - user needs current + new password 
    const res = await fetch('/api/users/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
    });

    // notification of result 
    if (res.ok){
        alert('Password updated'); 
    }
    else alert('Failed to update password');
});