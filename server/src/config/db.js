/**
 * server/src/config/db.js
 * -----------------------------------------------------------------------------
 * Creates and exports a single shared PostgreSQL connection pool for the
 * whole backend to use.
 *
 * Why a pool instead of one client:
 *   Express handles many concurrent requests. A pool hands out/reclaims
 *   individual connections per query so requests don't block each other
 *   waiting on a single shared connection.
 *
 * Inputs: none directly - reads PG* variables from process.env, which are
 *   loaded from server/.env by src/server.js before this module is used.
 *
 * Exports:
 *   pool - the pg.Pool instance. Controllers use pool.query(...) directly.
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  // Keep the pool small and simple - fine for a small team-facing tool.
  max: 10,
  idleTimeoutMillis: 30000,
});

// Log a clear message the first time we successfully open a connection, so
// startup problems (wrong password, DB not running, etc.) are obvious in
// the terminal rather than silently failing on the first request.
pool.on('connect', () => {
  console.log('PostgreSQL pool: connection established.');
});

// Surface unexpected pool-level errors (e.g. the DB restarting) instead of
// letting them crash the process silently.
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

module.exports = pool;
