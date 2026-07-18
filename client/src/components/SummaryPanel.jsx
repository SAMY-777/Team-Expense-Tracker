/**
 * client/src/components/SummaryPanel.jsx
 * -----------------------------------------------------------------------------
 * Displays total spend per category (computed server-side in SQL - see
 * server/src/controllers/summary.controller.js), with an optional month
 * filter, and clearly flags any category that has exceeded its monthly
 * budget.
 *
 * Props:
 *   refreshToken - changes whenever the parent wants this panel to re-fetch
 *                  (e.g. after an expense or category changes elsewhere).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { getSummary } from '../api/client';
import { useToast } from './ToastContext';

function currentMonth() {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

function SummaryPanel({ refreshToken }) {
  const [rows, setRows] = useState([]);
  const [month, setMonth] = useState(currentMonth());
  const [showAllTime, setShowAllTime] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSummary(showAllTime ? undefined : month);
      setRows(data);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [month, showAllTime, showToast]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, refreshToken]);

  const grandTotal = rows.reduce((sum, row) => sum + Number(row.totalSpent), 0);

  return (
    <div className="panel">
      <h2>Summary</h2>

      <div className="filters">
        <div className="form-field">
          <label htmlFor="summary-month">Month</label>
          <input
            id="summary-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={showAllTime}
          />
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={showAllTime}
            onChange={(e) => setShowAllTime(e.target.checked)}
          />
          Show all-time totals
        </label>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Category</th>
            <th>Monthly budget</th>
            <th>Total spent</th>
            <th># expenses</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={5} className="empty-row">Loading…</td>
            </tr>
          )}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-row">No categories yet.</td>
            </tr>
          )}
          {!isLoading &&
            rows.map((row) => (
              <tr key={row.categoryId} className={row.isOverBudget ? 'row-over-budget' : ''}>
                <td>{row.categoryName}</td>
                <td>{row.monthlyBudget !== null ? `$${Number(row.monthlyBudget).toFixed(2)}` : '—'}</td>
                <td>${Number(row.totalSpent).toFixed(2)}</td>
                <td>{row.expenseCount}</td>
                <td>
                  {row.isOverBudget ? (
                    <span className="badge badge-danger">Over budget</span>
                  ) : row.monthlyBudget !== null ? (
                    <span className="badge badge-ok">Within budget</span>
                  ) : (
                    <span className="badge badge-neutral">No budget set</span>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td></td>
              <td><strong>${grandTotal.toFixed(2)}</strong></td>
              <td></td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default SummaryPanel;
