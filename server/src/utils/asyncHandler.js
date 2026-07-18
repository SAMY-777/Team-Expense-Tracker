/**
 * server/src/utils/asyncHandler.js
 * -----------------------------------------------------------------------------
 * Wraps an async Express route handler so that any rejected promise (i.e.
 * any thrown error inside an `await`) is automatically forwarded to
 * Express's `next(err)` instead of crashing the process or requiring a
 * try/catch block in every single controller function.
 *
 * Inputs:
 *   fn - an async function with signature (req, res, next).
 *
 * Returns:
 *   A new function with the same (req, res, next) signature that Express
 *   can register directly as a route handler.
 *
 * Why it's needed:
 *   Express 4 does not automatically catch errors thrown inside async
 *   functions. Without this wrapper, an unhandled rejection in a
 *   controller would hang the request or crash the server instead of
 *   reaching the centralized error-handling middleware.
 */
function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    // Promise.resolve() normalizes both sync throws and async rejections
    // into a rejected promise, whose .catch forwards to Express's error
    // pipeline (see middleware/errorHandler.js).
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
