import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// get debug info from Postgres on connect to confirm successfull and correct configuration.
// we get standard database info, and then get specific role and user info based on current user
// put the SQl fields into clear named constants as otherwise the query is quite confusing
const connectionDebugQuery = `
  SELECT
   current_setting('server_version') AS postgres_version, 
   current_user AS database_user,
   role.oid AS role_id,
   role.rolsuper AS is_superuser,
   role.rolbypassrls AS bypasses_rls
  FROM pg_roles role WHERE role.rolname = current_user;
`;

async function checkDatabaseRole() {
  let privileged = false;

  try {
    const { rows } = await pool.query(connectionDebugQuery);
    const connection = rows[0];

    // log user and id so can check what user we using, and so we can check that we are not
    // accidentally using a superuser or a role that bypasses RLS. As audit log integrity relies on respecing RLS.
    console.log(
      `Successfully connected to PostgreSQL v${connection.postgres_version} as user ${connection.database_user} (role id: ${connection.role_id}) | Superuser: ${connection.is_superuser} | Bypass RLS: ${connection.bypasses_rls}`
    );

    if (connection.is_superuser || connection.bypasses_rls) {
      privileged = true;
    }
  } catch (err) {
    throw new Error('Error fetching Postgres connection details:', err);
  }

  // do not allow the server to start if user has connected with a privileged role
  // as this could allow tampering with the audit log. This is a critical security measure.
  if (privileged) {
    throw new Error(
      `Connected with a role that has too many privileges. For security and audit log integrity, the database connection must not be a superuser or have RLS bypass. Please create a new role with only the necessary permissions and update DATABASE_URL.`
    );
  }
}

checkDatabaseRole();

export default pool;
