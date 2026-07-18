/**
 * server/src/utils/ApiError.js
 * -----------------------------------------------------------------------------
 * A small custom Error subclass that carries an HTTP status code alongside
 * the message, so controllers can `throw new ApiError(400, 'reason')` and
 * the central error-handling middleware knows exactly what status/body to
 * send back, instead of every unexpected error becoming a generic 500.
 *
 * Inputs (constructor):
 *   statusCode - the HTTP status to respond with (e.g. 400, 404, 409).
 *   message    - a human-readable, user-safe explanation of what went wrong.
 *   details    - optional extra structured info (e.g. per-field validation
 *                errors) that the frontend can use to highlight form fields.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    // Marks this as an error we deliberately threw (vs. an unexpected bug),
    // so the error handler can decide how much detail is safe to expose.
    this.isOperational = true;
  }
}

module.exports = ApiError;
