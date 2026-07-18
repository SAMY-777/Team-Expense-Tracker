/**
 * server/src/routes/summary.routes.js
 * -----------------------------------------------------------------------------
 * Defines the /api/summary endpoint used by the Summary view.
 *   GET /api/summary?month=YYYY-MM (month is optional)
 */

const express = require('express');
const router = express.Router();

const { getSummary } = require('../controllers/summary.controller');
const asyncHandler = require('../utils/asyncHandler');

router.get('/', asyncHandler(getSummary));

module.exports = router;
