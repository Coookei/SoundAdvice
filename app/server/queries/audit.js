import pool from '../lib/db.js';

// selects the most recent log entry and returns the row_hash, which is used as prev_hash for the next log entry
export const getLastHash = async () => {
  const { rows } = await pool.query('SELECT row_hash FROM audit_log ORDER BY id DESC LIMIT 1');
  return rows[0]?.row_hash ?? null; // null if table is empty
};

// inserts a log entry into the audit log table
export const insertAuditLog = async (entry) => {
  await pool.query(
    `INSERT INTO audit_log
      (event_type, actor_id, ip, user_agent, detail, post_id, comment_id, created_at, prev_hash, row_hash, hmac)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      entry.event_type,
      entry.actor_id,
      entry.ip,
      entry.user_agent,
      entry.detail,
      entry.post_id,
      entry.comment_id,
      entry.created_at,
      entry.prev_hash,
      entry.row_hash,
      entry.hmac,
    ]
  );
};

// list logs with optional filters and pagination, used by the admin logs page
export const findAuditLogs = async ({ eventType, actorId, from, to, limit, offset }) => {
  const params = []; // arary to hold values given by user, will be passed as a parameterised query to the SELECT statement to prevent SQL injection
  const whereClauses = []; // holds where conditions as we build SQL query

  const placeholder = (value) => {
    params.push(value); // add user values to array, that will be used in parameterised query
    return '$' + params.length; // return placeholder eg $1, $2, based on position in array
  };

  if (eventType) {
    // if user provided an event type, add a clause to SQL statmenet such as 'event_type=$1'
    whereClauses.push('event_type = ' + placeholder(eventType));
  }
  if (actorId) {
    whereClauses.push('actor_id = ' + placeholder(actorId));
  }
  if (from) {
    whereClauses.push('created_at >= ' + placeholder(from));
  }
  if (to) {
    whereClauses.push('created_at <= ' + placeholder(to));
  }

  // now we build the SQL from the hardcoded select, from the where statements (that contain placeholders),
  // and order by and limit conditions. doesnt need the hash columns here.
  let sql = 'SELECT id, event_type, actor_id, ip, detail, post_id, comment_id, created_at FROM audit_log';

  if (whereClauses.length) {
    sql += ' WHERE ' + whereClauses.join(' AND ');
  }

  sql += ' ORDER BY id DESC LIMIT ' + placeholder(limit) + ' OFFSET ' + placeholder(offset);

  // the final SQL statement ONLY contains hardcoded strings and placeholders ($1, $2)
  // all user values (that have already been validated) are passed as parameterised query, so no SQL injection.
  const { rows } = await pool.query(sql, params);
  return rows;
};

// fetch every row in order, used by the integrity verifier on the admin page
export const findAllOrdered = async () => {
  const { rows } = await pool.query(
    `SELECT id, event_type, actor_id, ip, user_agent, detail, post_id, comment_id,
      created_at, prev_hash, row_hash, hmac
     FROM audit_log ORDER BY id ASC`
  ); // need to select everything to verify the integrity
  return rows;
};

// call this function to confirm that our RLS policy is correctly blocking UPDATE and DELETE on the autdit log table
const testRowLevelSecurity = async (log_id) => {
  try {
    await pool.query(`UPDATE audit_log SET detail = 'tampered' WHERE id = $1`, [log_id]);
    console.log('UPDATE was NOT blocked');
  } catch (err) {
    console.log('UPDATE blocked as expected:', err.message);
  }
  try {
    await pool.query(`DELETE FROM audit_log WHERE id = $1`, [log_id]);
    console.log('DELETE was NOT blocked');
  } catch (err) {
    console.log('DELETE blocked as expected:', err.message);
  }
};
// testRowLevelSecurity(1); // can uncomment this and show during demo
