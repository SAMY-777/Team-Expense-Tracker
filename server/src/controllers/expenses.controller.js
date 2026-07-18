/**
 * server/src/controllers/expenses.controller.js
 * -----------------------------------------------------------------------------
 * Handles all business logic for the /api/expenses routes: creating,
 * listing (with category/date filters + pagination), updating, and
 * deleting individual expenses.
 */

const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

// Default and maximum page size for GET /api/expenses. Keeps the list view
// fast and the payload small even once the table has many rows, per the
// assignment's "handle a realistic number of rows gracefully" requirement.
const DEFAULT_LIMIT = 20;

/**
 * Shared SELECT column list, joined with categories so the frontend gets
 * the category name without a second round trip per row.
 */
const SELECT_COLUMNS = `
  e.id,
  e.amount,
  e.description,
  e.category_id AS "categoryId",
  c.name AS "categoryName",
  to_char(e.expense_date, 'YYYY-MM-DD') AS "expenseDate",
  e.created_at AS "createdAt"
`;

/**
 * GET /api/expenses
 * Lists expenses, newest date first, with optional filtering by category
 * and/or a date range, and mandatory pagination.
 * Query params (all optional, validated by validateExpenseQuery):
 *   categoryId - filter to a single category
 *   startDate, endDate - inclusive YYYY-MM-DD date range filter
 *   page  - 1-indexed page number (default 1)
 *   limit - rows per page (default 20, max 100)
 * Returns: 200 with { data: [...], pagination: { page, limit, totalCount, totalPages } }
 */
async function listExpenses(req, res) {
  const { categoryId, startDate, endDate } = req.query;
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  // Build the WHERE clause dynamically based on which filters were supplied,
  // using parameterized placeholders throughout to prevent SQL injection.
  const conditions = [];
  const params = [];

  if (categoryId) {
    params.push(categoryId);
    conditions.push(`e.category_id = $${params.length}`);
  }
  if (startDate) {
    params.push(startDate);
    conditions.push(`e.expense_date >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate);
    conditions.push(`e.expense_date <= $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Total count for pagination metadata, run with the same filters but no
  // LIMIT/OFFSET so the frontend can render "Page 2 of 5" style controls.
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS count FROM expenses e ${whereClause}`,
    params
  );
  const totalCount = countResult.rows[0].count;

  // Actual page of rows. LIMIT/OFFSET params are appended after the filter
  // params so their $n placeholders don't collide.
  const dataParams = [...params, limit, offset];
  const dataResult = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM expenses e
     JOIN categories c ON c.id = e.category_id
     ${whereClause}
     ORDER BY e.expense_date DESC, e.id DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  res.status(200).json({
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / limit)),
    },
  });
}

/**
 * POST /api/expenses
 * Creates a new expense. Body already validated + normalized by
 * validators.validateExpense middleware before this runs.
 * Body: { amount: number, description: string, categoryId: number, expenseDate: 'YYYY-MM-DD' }
 * Returns: 201 with the newly created expense (joined with category name).
 */
async function createExpense(req, res) {
  const { amount, description, categoryId, expenseDate } = req.body;

  // Confirm the referenced category actually exists before inserting, so a
  // bad categoryId produces a clear 404 instead of relying solely on the
  // raw FK-violation error path.
  const categoryCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
  if (categoryCheck.rowCount === 0) {
    throw new ApiError(404, `Category ${categoryId} was not found.`);
  }

  const insertResult = await pool.query(
    `INSERT INTO expenses (amount, description, category_id, expense_date)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [amount, description.trim(), categoryId, expenseDate]
  );

  // Re-select through the same joined shape as listExpenses for a
  // consistent response contract with the frontend.
  const fullRow = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM expenses e JOIN categories c ON c.id = e.category_id WHERE e.id = $1`,
    [insertResult.rows[0].id]
  );

  res.status(201).json(fullRow.rows[0]);
}

/**
 * PUT /api/expenses/:id
 * Updates an existing expense. Body already validated by validateExpense.
 * Params: id - expense id from the URL.
 * Body: { amount, description, categoryId, expenseDate } (all required, full replace)
 * Returns: 200 with the updated expense, 404 if the id doesn't exist.
 */
async function updateExpense(req, res) {
  const { id } = req.params;
  const { amount, description, categoryId, expenseDate } = req.body;

  if (!Number.isInteger(Number(id))) {
    throw new ApiError(400, 'Expense id must be an integer.');
  }

  const categoryCheck = await pool.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
  if (categoryCheck.rowCount === 0) {
    throw new ApiError(404, `Category ${categoryId} was not found.`);
  }

  const updateResult = await pool.query(
    `UPDATE expenses
     SET amount = $1, description = $2, category_id = $3, expense_date = $4
     WHERE id = $5
     RETURNING id`,
    [amount, description.trim(), categoryId, expenseDate, id]
  );

  if (updateResult.rowCount === 0) {
    throw new ApiError(404, `Expense ${id} was not found.`);
  }

  const fullRow = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM expenses e JOIN categories c ON c.id = e.category_id WHERE e.id = $1`,
    [id]
  );

  res.status(200).json(fullRow.rows[0]);
}

/**
 * DELETE /api/expenses/:id
 * Deletes a single expense by id.
 * Returns: 204 No Content on success, 404 if the id doesn't exist.
 */
async function deleteExpense(req, res) {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    throw new ApiError(400, 'Expense id must be an integer.');
  }

  const result = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);

  if (result.rowCount === 0) {
    throw new ApiError(404, `Expense ${id} was not found.`);
  }

  res.status(204).send();
}

module.exports = { listExpenses, createExpense, updateExpense, deleteExpense };
