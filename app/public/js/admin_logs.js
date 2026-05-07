let currentPage = 1; // keep what page is being viewed clientside
let hasMore = false; // helper to know if should enable next page button

// helper function to read user values from the html filter inputs
function readFilters() {
  const filters = {};

  // get each html elements value, to get the filter value the user has specfied
  const eventType = document.getElementById('filterEventType').value;
  const actorId = document.getElementById('filterActorId').value;
  const from = document.getElementById('filterFrom').value;
  const to = document.getElementById('filterTo').value;

  if (eventType) {
    filters.event_type = eventType;
  }
  if (actorId) {
    filters.actor_id = actorId;
  }

  // the from and to inputs use datetime-local type which gives a 'YYYY-MM-DDTHH:mm' format string. postgres can parse this a TIMESTAMPTZ.
  // convert to an iso string, so tthat postgres will interpret correctly, even if server in diff time zone to the user.
  if (from) {
    filters.from = new Date(from).toISOString();
  }
  if (to) {
    filters.to = new Date(to).toISOString();
  }
  return filters;
}

// called on page load and whenever the user applies, clears filters or changes page.
async function loadLogs() {
  const filters = readFilters(); // read filter values that user has specified

  filters.page = currentPage; // store current js variable page in the filters object, so it is sent to the server

  const params = new URLSearchParams(filters); // creates a url query string like ?event_type=comment_created&page=2 from the filters object

  const response = await fetch('/api/logs?' + params.toString()); // get logs from server with filters as query params
  const data = await response.json();

  // populate the event type dropdown the first time, as options come back with the response
  const select = document.getElementById('filterEventType');
  if (select.options.length <= 1 && data.eventTypes) {
    // only populate if not already populated and if we received events from the server
    for (const type of data.eventTypes) {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type;
      select.appendChild(option);
    }
  }

  // update the buttons and page label at bottom of page
  hasMore = data.hasMore;
  document.getElementById('pageLabel').textContent = 'Page ' + currentPage;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = !hasMore;

  // get the tbody element, so we can add rows to it
  const tbody = document.getElementById('logsBody');
  tbody.innerHTML = ''; // clear out previous page

  // for each log entry, built a tr with td cells for each column, and add to table body
  for (const log of data.logs) {
    const row = document.createElement('tr');

    // build rowData with textContent only so a malicious user agent or detail
    // string cant inject html into admin table
    const rowData = [
      log.id,
      new Date(log.created_at).toLocaleString(),
      log.event_type,
      log.actor_id ?? '',
      log.ip ?? '',
      log.detail ?? '',
      log.post_id ?? '',
      log.comment_id ?? '',
    ];
    for (const value of rowData) {
      const td = document.createElement('td');
      td.textContent = value;
      row.appendChild(td);
    }

    tbody.appendChild(row);
  }
}

//apply event listeners to our buttons that update the currentPage and then reload the logs
document.getElementById('applyFilters').addEventListener('click', () => {
  currentPage = 1;
  loadLogs();
});

document.getElementById('clearFilters').addEventListener('click', () => {
  document.getElementById('filterEventType').value = '';
  document.getElementById('filterActorId').value = '';
  document.getElementById('filterFrom').value = '';
  document.getElementById('filterTo').value = '';
  currentPage = 1;
  loadLogs();
});

document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadLogs();
  }
});

document.getElementById('nextPage').addEventListener('click', () => {
  if (hasMore) {
    currentPage++;
    loadLogs();
  }
});

// verify button is used to verify integrity of logs, the server will do this and say if logs are valid or if tampering has been detected
document.getElementById('verifyButton').addEventListener('click', async () => {
  const result = document.getElementById('verifyResult');
  result.textContent = 'Verifying...';

  const response = await csrfFetch('/api/logs/verify', { method: 'POST' });
  const data = await response.json();

  if (data.ok) {
    result.textContent = 'Integrity verified across ' + data.count + ' rows.';
  } else {
    result.textContent = 'TAMPERING DETECTED at row ' + data.firstBreakId + ': ' + data.reason;
  }
});

// on page load, load the logs with default filters
loadLogs();
