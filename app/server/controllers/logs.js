import * as auditQueries from '../queries/audit.js';
import { AuditEvent, computeRowHash, computeHmac } from '../lib/audit.js';
import { validate, requirePositiveInt, requireOneOf, requireString } from '../lib/validate.js';

const VALID_EVENTS = Object.values(AuditEvent); // list of all valid audit events

// lists logs with optional filters and pagination, used by the admin logs page
export const getLogs = async (req, res) => {
  // validate all the optional query parameters
  const check = validate(() => {
    const filters = {}; // any unset filter ends up as undefined in this object

    // if any of the query parameters is specified but then fails validation, this will fail and we return 400 response
    // each of these returns the cleaned value which we add to the filter object, or will throw on error

    if (req.query.event_type) {
      filters.eventType = requireOneOf(req.query.event_type, VALID_EVENTS, 'event_type');
    }
    if (req.query.actor_id) {
      filters.actorId = requirePositiveInt(req.query.actor_id, 'actor_id');
    }
    if (req.query.from) {
      // restrict the length of these strings to prevent abuse, database will reject malformed timestamps
      filters.from = requireString(req.query.from, 'from', { min: 1, max: 40, trim: true });
    }
    if (req.query.to) {
      filters.to = requireString(req.query.to, 'to', { min: 1, max: 40, trim: true });
    }
    if (req.query.page) {
      filters.page = requirePositiveInt(req.query.page, 'page');
    }
    return filters;
  });

  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }

  const { eventType, actorId, from, to, page = 1 } = check.value;

  const PAGE_SIZE = 50; // hardcoded max page size

  const rows = await auditQueries.findAuditLogs({
    eventType,
    actorId,
    from,
    to,
    limit: PAGE_SIZE + 1, // get one extra row to check if there is a next page without needing another count query
    offset: (page - 1) * PAGE_SIZE, // how far to skip, for first page: (1-1)*50=0, so start at beginning, for second page: (2-1)*50=50, so skip first 50 rows
  });

  // we tried to select 1 more row than page size, if we got that extra row, then there is another page
  const hasMore = rows.length > PAGE_SIZE;

  // if there are more rows than page size we know there is a next page, but only return PAGE_SIZE rows now
  const logs = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  res.json({ logs, page, hasMore, eventTypes: VALID_EVENTS });
};

// walk the chain of logs in id order. for each row recompute the hash and HMAC and check that prev_hash
// matches the previous rows hash. report the first row that fails any of these checks
export const verifyLogs = async (req, res) => {
  const rows = await auditQueries.findAllOrdered(); // gets ALL ROWS so we can ensure the integrity of them as a whole

  let prevHash = '0'.repeat(64); // defaults to all zeros for the first record ever made

  for (const row of rows) {
    // first check to make sure the prev_hash matches the hash of previous row, to ensure chain is linked
    if (row.prev_hash !== prevHash) {
      return res.json({ ok: false, firstBreakId: row.id, reason: 'prev_hash does not match previous row' });
    }

    // second check is to recompute the hash of the current row and check it matches the stored hash, to check row hasnt been tampered with
    const expectedHash = computeRowHash({
      event_type: row.event_type,
      actor_id: row.actor_id,
      ip: row.ip,
      user_agent: row.user_agent,
      detail: row.detail,
      post_id: row.post_id,
      comment_id: row.comment_id,

      // pg returns TIMESTAMPTZ as a Date object, but we hashed an ISO string when inserting, so convert back to ISO
      created_at: row.created_at.toISOString(),
      prev_hash: row.prev_hash,
    });

    if (expectedHash !== row.row_hash) {
      return res.json({ ok: false, firstBreakId: row.id, reason: 'row_hash does not match recomputed hash' });
    }

    // third check is to recomput the HMAC using our server secret and check it matches the stored one
    // this field protects against tampering as an attacker would need the server secret to forge this.
    if (computeHmac(row.row_hash) !== row.hmac) {
      return res.json({ ok: false, firstBreakId: row.id, reason: 'hmac does not match' });
    }

    prevHash = row.row_hash;
  }

  res.json({ ok: true, count: rows.length });
};
