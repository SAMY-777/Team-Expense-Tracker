/**
 * server/db/runSql.js
 * -----------------------------------------------------------------------------
 * Tiny CLI helper used by the "db:schema" and "db:seed" npm scripts.
 *
 * What it does:
 *   Reads a .sql file (given as the first CLI argument, resolved relative to
 *   this db/ folder), connects to PostgreSQL using the same env vars the
 *   rest of the app uses, and executes the file's contents as one query.
 *
 * Inputs:
 *   process.argv[2] - filename of the SQL file to run, e.g. "schema.sql".
 *
 * Side effects:
 *   Executes DDL/DML against the configured PostgreSQL database. Exits the
 *   process with code 0 on success, 1 on failure (so it can be chained with
 *   "&&" in package.json scripts and CI).
 *
 * Why this exists:
 *   Keeps the "how do I set up my database" story to plain npm scripts
 *   instead of requiring a separate migration framework for a small app.
 */

const fs = require('fs');
const path = require('path');
// Load variables from server/.env into process.env before we read them below.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

// The SQL filename must be passed in, e.g. "node db/runSql.js schema.sql".
const fileName = process.argv[2];
if (!fileName) {
  console.error('Usage: node db/runSql.js <filename.sql>');
  process.exit(1);
}

// Resolve the file relative to this script's directory (server/db/) so the
// command works no matter which folder it's invoked from.
const filePath = path.join(__dirname, fileName);

async function main() {
  // Read the raw SQL text from disk.
  const sql = fs.readFileSync(filePath, 'utf8');

  // Build a connection pool from the same PG* env vars used by the app
  // (see src/config/db.js for the canonical connection setup).
  const pool = new Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });

  try {
    // node-postgres runs a string containing multiple ";"-separated
    // statements fine as long as no query parameters ($1, $2...) are used,
    // which is the case for our schema/seed files.
    await pool.query(sql);
    console.log(`Successfully ran ${fileName} against database "${process.env.PGDATABASE}".`);
  } catch (err) {
    console.error(`Failed to run ${fileName}:`, err.message);
    process.exitCode = 1;
  } finally {
    // Always close the pool so the CLI process can exit cleanly.
    await pool.end();
  }
}

main();
