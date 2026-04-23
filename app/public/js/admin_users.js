async function loadUsers() {
  const response = await fetch('/api/users'); // this is an admin only endpoint

  const { users } = await response.json();

  // find table body element and append created rows with each user
  const tbody = document.getElementById('usersBody');

  // user.email property is available but currently censored in UI for privacy

  for (const user of users) {
    const row = document.createElement('tr');

    // build cells with textContent so a malicious username can't inject HTML into the admin table
    const cells = [
      user.id,
      user.username,
      'xxxxxxxx@gmail.com',
      user.is_admin ? 'Yes' : 'No',
      new Date(user.created_at).toLocaleDateString(),
    ];
    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = value;
      row.appendChild(td);
    }

    tbody.appendChild(row);
  }
}

loadUsers();
