/**
 * client/src/api/client.js
 * -----------------------------------------------------------------------------
 * Thin wrapper around the browser fetch() API for talking to the backend.
 * Centralizes: the base URL, JSON header/body handling, and turning
 * non-2xx responses into thrown JS Error objects with a readable message
 * (pulled from the backend's { error, details } JSON body) so every caller
 * can just try/catch instead of manually checking response.ok everywhere.
 */

// Base URL of the API, e.g. "http://localhost:5000/api". Falls back to a
// sensible local default if VITE_API_BASE_URL isn't set, so the app still
// works even if a developer forgets to create client/.env.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Internal helper that performs a fetch() call, attaches JSON headers/body
 * when needed, and normalizes errors.
 *
 * Inputs:
 *   path   - API path relative to API_BASE_URL, e.g. "/expenses".
 *   options - standard fetch() options (method, body as a plain JS object).
 *
 * Returns: parsed JSON response body (or undefined for 204 No Content).
 * Throws: an Error whose .message is the backend's error message, and
 *   whose .details (if present) holds per-field validation errors.
 */
async function request(path, options = {}) {
  const { method = 'GET', body } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content has no body to parse (used by our DELETE endpoints).
  if (response.status === 204) {
    return undefined;
  }

  // Attempt to parse JSON even on error responses, since our backend
  // always returns a JSON { error, details? } body on failures.
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error((payload && payload.error) || `Request failed with status ${response.status}`);
    error.details = payload && payload.details;
    error.status = response.status;
    throw error;
  }

  return payload;
}

// ---- Categories ---------------------------------------------------------

/** Fetches all categories. Returns an array of { id, name, monthlyBudget, createdAt }. */
export function getCategories() {
  return request('/categories');
}

/** Creates a category. `payload` = { name, monthlyBudget }. Returns the created row. */
export function createCategory(payload) {
  return request('/categories', { method: 'POST', body: payload });
}

/** Deletes a category by id. Throws (409) if it still has expenses. */
export function deleteCategory(id) {
  return request(`/categories/${id}`, { method: 'DELETE' });
}

// ---- Expenses -------------------------------------------------------------

/**
 * Fetches a page of expenses.
 * `filters` may include categoryId, startDate, endDate, page, limit.
 * Returns { data: [...], pagination: {...} }.
 */
export function getExpenses(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  const queryString = params.toString();
  return request(`/expenses${queryString ? `?${queryString}` : ''}`);
}

/** Creates an expense. `payload` = { amount, description, categoryId, expenseDate }. */
export function createExpense(payload) {
  return request('/expenses', { method: 'POST', body: payload });
}

/** Updates an expense by id with a full replacement payload. */
export function updateExpense(id, payload) {
  return request(`/expenses/${id}`, { method: 'PUT', body: payload });
}

/** Deletes an expense by id. */
export function deleteExpense(id) {
  return request(`/expenses/${id}`, { method: 'DELETE' });
}

// ---- Summary --------------------------------------------------------------

/** Fetches per-category totals. `month` is an optional 'YYYY-MM' filter. */
export function getSummary(month) {
  return request(`/summary${month ? `?month=${month}` : ''}`);
}
