/**
 * server/src/server.js
 * -----------------------------------------------------------------------------
 * Entry point for the backend process. Loads environment variables, then
 * starts the Express app (built in app.js) listening on the configured port.
 */

// Load server/.env into process.env before anything else reads from it.
require('dotenv').config();

const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Team Expense Tracker API listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
