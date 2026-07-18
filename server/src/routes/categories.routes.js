/**
 * server/src/routes/categories.routes.js
 * -----------------------------------------------------------------------------
 * Defines the /api/categories endpoints and wires each one to its
 * validation middleware and controller function.
 *
 *   GET    /api/categories      -> list all categories
 *   POST   /api/categories      -> create a new category
 *   DELETE /api/categories/:id  -> delete a category (blocked if it still
 *                                  has expenses - see controller comments)
 */

const express = require('express');
const router = express.Router();

const { listCategories, createCategory, deleteCategory } = require('../controllers/categories.controller');
const { validateCategory } = require('../middleware/validators');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(listCategories));
router.post('/', validateCategory, asyncHandler(createCategory));
router.delete('/:id', asyncHandler(deleteCategory));

module.exports = router;
