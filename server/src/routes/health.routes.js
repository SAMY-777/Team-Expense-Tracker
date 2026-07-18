/**
 * server/src/routes/health.routes.js
 * -----------------------------------------------------------------------------
 * A simple liveness/readiness check at GET /api/health.
 * Also confirms the database connection is actually alive (not just that
 * the Express process is running), which is what deployment platforms and
 * uptime monitors actually want to know.
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    // A trivial query confirms the pool can actually reach PostgreSQL,
    // not just that it was configured.
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  })
);

module.exports = router;
