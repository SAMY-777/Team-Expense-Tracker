/**
 * client/src/components/ExpensesPanel.jsx
 * -----------------------------------------------------------------------------
 * The main Expenses tab: filter controls (category + date range), a paged
 * table of results, and Edit/Delete actions per row. Edit hands the row off
 * to ExpenseForm (rendered by the parent, App.jsx) via the onEdit callback.
 *
 * Props:
 *   categories   - array of categories, used to populate the filter <select>.
 *   editingId    - id of the expense currently being edited (to visually
 *                  highlight that row), or null.
 *   onEdit       - (expense) => void, called when the user clicks "Edit".
 *   refreshToken - a value that changes whenever the parent wants this list
 *                  to re-fetch (e.g. after an add/edit/delete elsewhere).
 *   onDelete     - async (id) => void, called when the user confirms delete.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { getExpenses } from '../api/client';
import { useToast } from './ToastContext';

const PAGE_SIZE = 10;

function ExpensesPanel({ categories, editingId, onEdit, onDelete, refreshToken }) {
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalCount: 0 });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const { showToast } = useToast();

  // Fetches the current page of expenses using the active filters. Wrapped
  // in useCallback so the effect below has a stable reference to depend on.
  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getExpenses({
        categoryId: categoryFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setExpenses(result.data);
      setPagination(result.pagination);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, startDate, endDate, page, showToast]);

  // Re-fetch whenever a filter, the page, or an external refresh signal
  // changes (e.g. after adding/editing/deleting an expense elsewhere).
  useEffect(() => {
    loadExpenses();
  }, [loadExpenses, refreshToken]);

  // Any time a filter changes, jump back to page 1 - staying on page 4 of
  // a now-much-shorter filtered list would just show an empty page.
  function handleFilterChange(setter) {
    return (event) => {
      setter(event.target.value);
      setPage(1);
    };
  }

  async function handleDeleteClick(expense) {
    if (!window.confirm(`Delete expense "${expense.description}"?`)) return;
    setDeletingId(expense.id);
    try {
      await onDelete(expense.id);
      await loadExpenses();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="panel">
      <h2>Expenses</h2>

      <div className="filters">
        <div className="form-field">
          <label htmlFor="filter-category">Category</label>
          <select id="filter-category" value={categoryFilter} onChange={handleFilterChange(setCategoryFilter)}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="filter-start">From</label>
          <input id="filter-start" type="date" value={startDate} onChange={handleFilterChange(setStartDate)} />
        </div>
        <div className="form-field">
          <label htmlFor="filter-end">To</label>
          <input id="filter-end" type="date" value={endDate} onChange={handleFilterChange(setEndDate)} />
        </div>
        {(categoryFilter || startDate || endDate) && (
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setCategoryFilter('');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={5} className="empty-row">Loading…</td>
            </tr>
          )}
          {!isLoading && expenses.length === 0 && (
            <tr>
              <td colSpan={5} className="empty-row">No expenses match these filters.</td>
            </tr>
          )}
          {!isLoading &&
            expenses.map((expense) => (
              <tr key={expense.id} className={editingId === expense.id ? 'row-editing' : ''}>
                <td>{expense.expenseDate}</td>
                <td>{expense.description}</td>
                <td>{expense.categoryName}</td>
                <td>${Number(expense.amount).toFixed(2)}</td>
                <td className="row-actions">
                  <button className="link-button" onClick={() => onEdit(expense)}>
                    Edit
                  </button>
                  <button
                    className="link-button danger"
                    onClick={() => handleDeleteClick(expense)}
                    disabled={deletingId === expense.id}
                  >
                    {deletingId === expense.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          ← Previous
        </button>
        <span>
          Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
        </span>
        <button disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}

export default ExpensesPanel;
