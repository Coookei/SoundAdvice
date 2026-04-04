import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.DATABASE_URL) {
  pool
    .query('SELECT version()')
    .then((res) => {
      console.log('Connected to Postgres version:', res.rows[0].version);
    })
    .catch((err) => {
      console.error('Error fetching Postgres version:', err);
    });
}

export default pool;
