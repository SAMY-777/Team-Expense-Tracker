/**
 * server/src/middleware/errorHandler.js
 * -----------------------------------------------------------------------------
 * Centralized Express error-handling middleware. Must be registered LAST in
 * app.js (after all routes) - Express recognizes it as an error handler
 * because it declares 4 parameters (err, req, res, next).
 *
 * What it does:
 *   - Maps known error shapes (ApiError, Postgres constraint violations) to
 *     appropriate HTTP status codes and clean JSON error bodies.
 *   - Never leaks stack traces or raw DB errors to the client.
 *   - Logs the full error server-side for debugging.
 *
 * Inputs:
 *   err - the thrown/forwarded error object.
 *
 * Side effects:
 *   Sends the HTTP response and logs to the server console.
 */

function errorHandler(err, req, res, next) {
  // Always log the full error on the server for debugging, regardless of
  // what we choose to expose to the client.
  console.error('API Error:', err);

  // Case 1: an error we deliberately threw via ApiError - trust its status
  // code, message, and optional field-level details.
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details || undefined,
    });
  }

  // Case 2: PostgreSQL foreign-key violation (code 23503). This is the
  // "delete a category that still has expenses" scenario - the DB itself
  // enforces this via ON DELETE RESTRICT, so we translate the raw DB error
  // into a friendly 409 Conflict instead of a scary 500.
  if (err.code === '23503') {
    return res.status(409).json({
      error: 'This category still has expenses linked to it. Reassign or delete those expenses first.',
    });
  }

  // Case 3: PostgreSQL unique-constraint violation (code 23505), e.g.
  // creating a category with a name that already exists.
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'A record with that value already exists.',
    });
  }

  // Case 4: PostgreSQL check-constraint violation (code 23514) - a value
  // that bypassed our app-level validation but still violates a DB CHECK.
  if (err.code === '23514') {
    return res.status(400).json({
      error: 'The submitted data violates a database constraint (e.g. amount must be positive).',
    });
  }

  // Fallback: anything unexpected becomes a generic 500 with no internal
  // details exposed to the client.
  const status = err.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? 'Something went wrong on the server. Please try again.' : err.message,
  });
}

module.exports = errorHandler;
