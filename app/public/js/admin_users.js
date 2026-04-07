async function loadUsers() {
  const response = await fetch('/api/users'); // this is an admin only endpoint

  const { users } = await response.json();

  // find table body element and append created rows with each user
  const tbody = document.getElementById('usersBody');

  // user.email property is available but currently censored in UI for privacy

  for (const user of users) {
    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username}</td>
      <td>xxxxxxxx@gmail.com</td>
      <td>${user.is_admin ? 'Yes' : 'No'}</td>
      <td>${new Date(user.created_at).toLocaleDateString()}</td>
    `;

    tbody.appendChild(row);
  }
}

loadUsers();
