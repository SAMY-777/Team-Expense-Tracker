/**
 * server/src/app.js
 * -----------------------------------------------------------------------------
 * Assembles the Express application: global middleware, route mounting,
 * a 404 fallback, and the centralized error handler.
 * Exported (not started here) so it can be reused by tests without binding
 * a real port. The actual `listen()` call lives in server.js.
 */

const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const categoriesRoutes = require('./routes/categories.routes');
const expensesRoutes = require('./routes/expenses.routes');
const summaryRoutes = require('./routes/summary.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ---- Global middleware ------------------------------------------------

// Allow the configured frontend origin(s) to call this API. CLIENT_ORIGIN
// can be a single origin or a comma-separated list.
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
  })
);

// Parse incoming JSON request bodies into req.body.
app.use(express.json());

// ---- Routes -------------------------------------------------------------
// Mounted under /api/* to keep a clean, versionable API surface.
app.use('/api/health', healthRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/summary', summaryRoutes);

// ---- 404 fallback -----------------------------------------------------
// Anything that doesn't match a route above falls through to here.
app.use((req, res) => {
  res.status(404).json({ error: `No route found for ${req.method} ${req.originalUrl}` });
});

// ---- Centralized error handler -----------------------------------------
// Must be registered last so Express treats it as the error-handling
// middleware (identified by its 4-argument signature).
app.use(errorHandler);

module.exports = app;
