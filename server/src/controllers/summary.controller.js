/**
 * server/src/controllers/summary.controller.js
 * -----------------------------------------------------------------------------
 * Powers the Summary view: total spend per category, with categories that
 * exceed their monthly budget clearly flagged.
 *
 * Per the assignment's explicit requirement, ALL aggregation happens in SQL
 * (SUM/COUNT/GROUP BY) - the server never fetches every expense row and
 * sums them in JavaScript. This keeps the endpoint fast and correct even as
 * the expenses table grows large, since Postgres can use the
 * idx_expenses_category_id index and never has to serialize every row over
 * the wire.
 */

const pool = require('../config/db');

/**
 * GET /api/summary
 * Optional query params: month (YYYY-MM). When provided, totals are scoped
 * to that calendar month (matched against expense_date); when omitted,
 * totals cover all time. The "over budget" flag always compares against
 * the category's single monthly_budget value, since budgets in this app
 * are a flat monthly figure rather than being tracked per historical month.
 * Returns: 200 with an array of
 *   { categoryId, categoryName, monthlyBudget, totalSpent, expenseCount, isOverBudget }
 */
async function getSummary(req, res) {
  const { month } = req.query;

  // LEFT JOIN so categories with zero expenses still appear in the summary
  // (with totalSpent = 0), and COALESCE turns SQL NULL (no matching rows)
  // into 0 for a clean numeric response. The date filter is applied inside
  // the JOIN condition (not a WHERE clause) precisely so that a category
  // with no expenses *in that month* still shows up as a 0-spend row
  // instead of disappearing from the summary entirely.
  const monthFilter = month ? `AND to_char(e.expense_date, 'YYYY-MM') = $1` : '';
  const params = month ? [month] : [];

  const result = await pool.query(
    `SELECT
       c.id AS "categoryId",
       c.name AS "categoryName",
       c.monthly_budget AS "monthlyBudget",
       COALESCE(SUM(e.amount), 0) AS "totalSpent",
       COUNT(e.id)::int AS "expenseCount",
       (c.monthly_budget IS NOT NULL AND COALESCE(SUM(e.amount), 0) > c.monthly_budget) AS "isOverBudget"
     FROM categories c
     LEFT JOIN expenses e ON e.category_id = c.id ${monthFilter}
     GROUP BY c.id, c.name, c.monthly_budget
     ORDER BY c.name ASC`,
    params
  );

  res.status(200).json(result.rows);
}

module.exports = { getSummary };
