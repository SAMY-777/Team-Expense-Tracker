/**
 * server/src/routes/expenses.routes.js
 * -----------------------------------------------------------------------------
 * Defines the /api/expenses endpoints and wires each one to its validation
 * middleware and controller function.
 *
 *   GET    /api/expenses      -> list expenses (filter + paginate)
 *   POST   /api/expenses      -> create a new expense
 *   PUT    /api/expenses/:id  -> update an existing expense
 *   DELETE /api/expenses/:id  -> delete an expense
 */

const express = require('express');
const router = express.Router();

const { listExpenses, createExpense, updateExpense, deleteExpense } = require('../controllers/expenses.controller');
const { validateExpense, validateExpenseQuery } = require('../middleware/validators');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', validateExpenseQuery, asyncHandler(listExpenses));
router.post('/', validateExpense, asyncHandler(createExpense));
router.put('/:id', validateExpense, asyncHandler(updateExpense));
router.delete('/:id', asyncHandler(deleteExpense));

module.exports = router;
