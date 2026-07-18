/**
 * server/src/middleware/validators.js
 * -----------------------------------------------------------------------------
 * Server-side validation for incoming request payloads. This is the
 * authoritative validation layer - the frontend also validates for a good
 * UX, but this file is what actually protects the database, per the
 * assignment's "validate on the server, not just the UI" requirement.
 *
 * Each exported function is Express middleware: it inspects req.body,
 * either calls next() to continue or throws an ApiError(400, ...) which is
 * caught by asyncHandler-wrapped routes... but since these run
 * synchronously and are registered directly (not wrapped), we call
 * next(err) explicitly here rather than throwing, so no wrapper is required.
 */

const ApiError = require('../utils/ApiError');

/**
 * A YYYY-MM-DD date string checker. We deliberately require this exact
 * format (rather than accepting any string Date() can parse) so that
 * ambiguous formats like "07/08/2026" can't silently mean different things
 * to different users.
 */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Returns true if `value` parses to a real calendar date, e.g. rejects 2026-02-30. */
function isRealDate(value) {
  if (!DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Validates the body of POST/PUT /api/expenses requests.
 * Expects: { amount: number, description: string, categoryId: number, expenseDate: 'YYYY-MM-DD' }
 * Rejects: missing fields, non-numeric/negative/zero amount, blank
 * description, non-integer categoryId, and invalid/malformed dates.
 * On failure: calls next() with an ApiError(400, ...) carrying per-field
 * details so the frontend can show inline errors.
 */
function validateExpense(req, res, next) {
  const { amount, description, categoryId, expenseDate } = req.body;
  const errors = {};

  // Amount must be present, numeric, and strictly greater than zero.
  const numericAmount = Number(amount);
  if (amount === undefined || amount === null || amount === '') {
    errors.amount = 'Amount is required.';
  } else if (Number.isNaN(numericAmount)) {
    errors.amount = 'Amount must be a number.';
  } else if (numericAmount <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  }

  // Description must be a non-empty string once whitespace is trimmed.
  if (typeof description !== 'string' || description.trim().length === 0) {
    errors.description = 'Description is required.';
  } else if (description.trim().length > 500) {
    errors.description = 'Description must be 500 characters or fewer.';
  }

  // categoryId must be a positive integer. Existence of the category itself
  // is checked in the controller (a 404 there is more accurate than a 400
  // here, since "not a number" and "doesn't exist" are different problems).
  const numericCategoryId = Number(categoryId);
  if (categoryId === undefined || categoryId === null || categoryId === '') {
    errors.categoryId = 'Category is required.';
  } else if (!Number.isInteger(numericCategoryId) || numericCategoryId <= 0) {
    errors.categoryId = 'Category must be a valid category id.';
  }

  // expenseDate must be a real, well-formed calendar date.
  if (!expenseDate) {
    errors.expenseDate = 'Date is required.';
  } else if (!isRealDate(expenseDate)) {
    errors.expenseDate = 'Date must be a valid date in YYYY-MM-DD format.';
  }

  if (Object.keys(errors).length > 0) {
    return next(new ApiError(400, 'Invalid expense data.', errors));
  }

  // Normalize amount to a Number on the request so the controller doesn't
  // need to re-parse it.
  req.body.amount = numericAmount;
  req.body.categoryId = numericCategoryId;
  next();
}

/**
 * Validates the body of POST /api/categories requests.
 * Expects: { name: string, monthlyBudget?: number | null }
 * Rejects: blank name, and a monthlyBudget that is present but not a
 * positive number.
 */
function validateCategory(req, res, next) {
  const { name, monthlyBudget } = req.body;
  const errors = {};

  if (typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Category name is required.';
  } else if (name.trim().length > 100) {
    errors.name = 'Category name must be 100 characters or fewer.';
  }

  // monthlyBudget is optional. If provided (not null/undefined/''), it must
  // be a positive number.
  if (monthlyBudget !== undefined && monthlyBudget !== null && monthlyBudget !== '') {
    const numericBudget = Number(monthlyBudget);
    if (Number.isNaN(numericBudget) || numericBudget <= 0) {
      errors.monthlyBudget = 'Monthly budget must be a positive number if provided.';
    } else {
      req.body.monthlyBudget = numericBudget;
    }
  } else {
    // Normalize "no budget" to null for a consistent DB write.
    req.body.monthlyBudget = null;
  }

  if (Object.keys(errors).length > 0) {
    return next(new ApiError(400, 'Invalid category data.', errors));
  }

  next();
}

/**
 * Validates optional query-string filters on GET /api/expenses:
 * categoryId, startDate, endDate, page, limit. Anything present must be
 * well-formed; anything absent is simply skipped (all filters optional).
 */
function validateExpenseQuery(req, res, next) {
  const { categoryId, startDate, endDate, page, limit } = req.query;
  const errors = {};

  if (categoryId !== undefined && (!Number.isInteger(Number(categoryId)) || Number(categoryId) <= 0)) {
    errors.categoryId = 'categoryId must be a positive integer.';
  }
  if (startDate !== undefined && !isRealDate(startDate)) {
    errors.startDate = 'startDate must be a valid YYYY-MM-DD date.';
  }
  if (endDate !== undefined && !isRealDate(endDate)) {
    errors.endDate = 'endDate must be a valid YYYY-MM-DD date.';
  }
  if (startDate !== undefined && endDate !== undefined && isRealDate(startDate) && isRealDate(endDate) && startDate > endDate) {
    errors.dateRange = 'startDate must not be after endDate.';
  }
  if (page !== undefined && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
    errors.page = 'page must be a positive integer.';
  }
  if (limit !== undefined && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    errors.limit = 'limit must be an integer between 1 and 100.';
  }

  if (Object.keys(errors).length > 0) {
    return next(new ApiError(400, 'Invalid query parameters.', errors));
  }

  next();
}

module.exports = { validateExpense, validateCategory, validateExpenseQuery, isRealDate };
