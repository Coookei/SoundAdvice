async function loadUsers() {
  const response = await fetch('/api/users'); // this is an admin only endpoint

  const { users } = await response.json();

  // find table body element and append created rows with each user
  const tbody = document.getElementById('usersBody');

  for (const user of users) {
    const row = document.createElement('tr');

    // id cell
    const idTd = document.createElement('td');
    idTd.textContent = user.id; // build table cells with textContent to stop xss
    row.appendChild(idTd);

    // username cell, linking to profile
    const usernameTd = document.createElement('td');
    const usernameLink = document.createElement('a');
    usernameLink.href = '/profile/' + user.id;
    usernameLink.textContent = user.username;
    usernameTd.appendChild(usernameLink);
    row.appendChild(usernameTd);

    // the masked email cell
    const emailTd = document.createElement('td');
    emailTd.textContent = user.email;
    row.appendChild(emailTd);

    // is admin cell
    const adminTd = document.createElement('td');
    adminTd.textContent = user.is_admin ? 'Yes' : 'No';
    row.appendChild(adminTd);

    // join date cell
    const joinedTd = document.createElement('td');
    joinedTd.textContent = new Date(user.created_at).toLocaleDateString();
    row.appendChild(joinedTd);

    tbody.appendChild(row);
  }
}

loadUsers();
