import crypto from 'crypto';
import { appendFile, mkdir } from 'fs/promises'; // use async file saving to not block
import { join } from 'path';
import * as auditQueries from '../queries/audit.js';

// for file saving of logs, get the audit.jsonl path
const LOG_DIR = join(process.cwd(), 'logs');
const AUDIT_LOG_PATH = join(LOG_DIR, 'audit.jsonl');

// enum style list of all audit log events, mirrors the audit_event enum in db migration file 09
export const AuditEvent = {
  REGISTER: 'register',
  REGISTER_CAPTCHA_FAIL: 'register_captcha_fail',
  REGISTER_DUPLICATE: 'register_duplicate',

  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAIL: 'login_fail',
  LOGIN_2FA_PENDING: 'login_2fa_pending',

  TWOFA_SUCCESS: '2fa_success',
  TWOFA_FAIL: '2fa_fail',
  TWOFA_EXPIRED: '2fa_expired',
  TWOFA_LOCKOUT: '2fa_lockout',

  LOGOUT: 'logout',

  FORGOT_REQUESTED: 'forgot_requested',
  FORGOT_UNKNOWN_EMAIL: 'forgot_unknown_email',
  FORGOT_BAD_CODE: 'forgot_bad_code',
  FORGOT_RESET: 'forgot_reset',

  MAGIC_LINK_REQUEST: 'magic_link_request',
  MAGIC_LINK_LOGIN: 'magic_link_login',
  MAGIC_LINK_UNKNOWN_EMAIL: 'magic_link_unknown_email',
  MAGIC_LINK_ADMIN_BLOCKED: 'magic_link_admin_blocked',
  MAGIC_LINK_ADMIN_VERIFY_BLOCKED: 'magic_link_admin_verify_blocked',

  POST_CREATED: 'post_created',
  POST_UPDATED: 'post_updated',
  POST_DELETED: 'post_deleted',
  POST_STATUS_CHANGED: 'post_status_changed',

  COMMENT_CREATED: 'comment_created',
  COMMENT_DELETED: 'comment_deleted',

  // whenever a new audit event is added here, it needs to also be added to the postgres enum in the audit_log table, so create a migration.
};

const VALID_EVENTS = Object.values(AuditEvent); // list of all valid audit events

// hash a predictable text version of an audit log row, so this simply
// combines all the fields into a single string, alongside the previous row hash.
const formatRowForHash = (row) => {
  const parts = [
    row.event_type,
    row.actor_id ?? '', // if field not set use empty string, over null or undefined
    row.ip ?? '',
    row.user_agent ?? '',
    row.detail ?? '',
    row.post_id ?? '',
    row.comment_id ?? '',
    row.created_at,
    row.prev_hash, // including previous hash means changing an old row breaks the chain, so shows tampering
  ];
  return parts.join('|'); // generic separator to keep fields separate
};

export const computeRowHash = (row) => {
  const stringAuditLog = formatRowForHash(row); // convert log entry to predictable string format

  return crypto.createHash('sha256').update(stringAuditLog).digest('hex'); // this hash is the row_hash value in the db
};

export const computeHmac = (rowHash) => {
  // use our row hash with a secret server side value to create an hmac for the row.
  // this means if if attacker modifies row and then recomputes the row_hash, they are
  // unable to then produce a valid hmac without having the server secret - if they are on the server anyways, the DB connection secret does not even allow modifying the audit log rows

  return crypto.createHmac('sha256', process.env.LOG_SECRET).update(rowHash).digest('hex');
};

// this creates a queue of promises. each recordEvent call adds its promise to the end of the queue
// so they run one by one and in order. this prevents multiple requests from getting the same prev_hash and then creating a fork in the chain.
let queue = Promise.resolve();

const createRecord = async (req, type, fields) => {
  if (!VALID_EVENTS.has(type)) {
    // shouldnt happen as we use the AuditEvent constants in our code.
    throw new Error(`Unknown audit event type ${type}`);
  }

  // get the previous hash to link to, or use 64 zeros for the first ever record
  const prevHash = (await auditQueries.getLastHash()) ?? '0'.repeat(64); // 64 hex chars for sha256

  // build a row object
  const row = {
    event_type: type,

    ip: req?.ip ?? null, // ip is inferred
    user_agent: req?.headers?.['user-agent'] ?? null, // user agent is inferred

    // these fields are all explicitly set
    actor_id: fields.actorId ?? null,
    detail: fields.detail ?? null,
    post_id: fields.postId ?? null,
    comment_id: fields.commentId ?? null,

    created_at: new Date().toISOString(), // the created_at timestamp is generated here in js rather than in the DB because it is used to calulate the hash, so must be identical
    prev_hash: prevHash,
  };

  row.row_hash = computeRowHash(row); // using the object we defined, we now hash it
  row.hmac = computeHmac(row.row_hash); // compute tamper proof hmac, that uses the server secret

  // insert the row into the db and also append to our file log. this gives two sources of truth that can be cross checked
  await auditQueries.insertAuditLog(row);
  await appendAuditFile(row);
};

const appendAuditFile = async (entry) => {
  await mkdir(LOG_DIR, { recursive: true }); // ensure log dir exists
  await appendFile(AUDIT_LOG_PATH, JSON.stringify(entry) + '\n'); // appends log entry as line of json to logs/audit.jsonl file
};

// main function called to log an audit event
export const recordEvent = (req, type, fields = {}) => {
  const next = queue.then(() => createRecord(req, type, fields)); // add the creation of log event to the end of a queue

  // if error happens, catch here so doesnt break the queue
  queue = next.catch(() => {}); // promises are immutable so .catch creates a new promise that we assign back to queue, without letting error break the chain.

  return next; // we still return original promise to caller so if there was an error they can handle it
};
