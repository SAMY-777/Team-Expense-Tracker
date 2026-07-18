/**
 * server/src/controllers/categories.controller.js
 * -----------------------------------------------------------------------------
 * Handles all business logic for the /api/categories routes: creating
 * categories, listing them, and deleting them.
 *
 * Design choice - deleting a category that still has expenses:
 *   The categories.expenses foreign key uses ON DELETE RESTRICT (see
 *   db/schema.sql). That means PostgreSQL itself refuses the DELETE and
 *   raises error code 23503, which errorHandler.js translates into a
 *   409 Conflict with a friendly message. We chose RESTRICT (not CASCADE
 *   or SET NULL) because silently deleting a team's historical expense
 *   records, or silently detaching them from any category, both destroy
 *   information the team may need for reporting later. Requiring an
 *   explicit "move or delete the expenses first" step is safer for a
 *   shared expense ledger.
 */

const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * GET /api/categories
 * Lists all categories, ordered alphabetically by name.
 * No query params required.
 * Returns: 200 with an array of { id, name, monthlyBudget, createdAt }.
 */
async function listCategories(req, res) {
  const result = await pool.query(
    `SELECT id, name, monthly_budget AS "monthlyBudget", created_at AS "createdAt"
     FROM categories
     ORDER BY name ASC`
  );
  res.status(200).json(result.rows);
}

/**
 * POST /api/categories
 * Creates a new category. Body already validated + normalized by
 * validators.validateCategory middleware before this runs.
 * Body: { name: string, monthlyBudget: number | null }
 * Returns: 201 with the newly created category row.
 */
async function createCategory(req, res) {
  const { name, monthlyBudget } = req.body;

  const result = await pool.query(
    `INSERT INTO categories (name, monthly_budget)
     VALUES ($1, $2)
     RETURNING id, name, monthly_budget AS "monthlyBudget", created_at AS "createdAt"`,
    [name.trim(), monthlyBudget]
  );

  res.status(201).json(result.rows[0]);
}

/**
 * DELETE /api/categories/:id
 * Deletes a category by id. If expenses still reference it, PostgreSQL's
 * ON DELETE RESTRICT rejects the query and the centralized error handler
 * converts that into a 409 response (see file header comment above).
 * Params: id - category id from the URL.
 * Returns: 204 No Content on success, 404 if the id doesn't exist.
 */
async function deleteCategory(req, res) {
  const { id } = req.params;

  // Guard against non-numeric ids before hitting Postgres, so a typo in the
  // URL produces a clean 400 instead of a raw type-cast error.
  if (!Number.isInteger(Number(id))) {
    throw new ApiError(400, 'Category id must be an integer.');
  }

  const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);


  if (result.rowCount === 0) {
    throw new ApiError(404, `Category ${id} was not found.`);
  }

  res.status(204).send();
}

module.exports = { listCategories, createCategory, deleteCategory };
