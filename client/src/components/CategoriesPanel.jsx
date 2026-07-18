/**
 * client/src/components/CategoriesPanel.jsx
 * -----------------------------------------------------------------------------
 * Lets the user view all categories, create a new one (name + optional
 * monthly budget), and delete one. Deleting a category that still has
 * expenses is rejected by the backend (409) - we surface that as a toast
 * rather than crashing, so the user understands why the delete didn't
 * happen and what to do about it.
 *
 * Props:
 *   categories    - array of category objects from the parent (single
 *                   source of truth, shared with the expense form/list).
 *   onCategoriesChanged - callback to ask the parent to re-fetch categories
 *                   after a create/delete so every panel stays in sync.
 */

import React, { useState } from 'react';
import { createCategory, deleteCategory } from '../api/client';
import { useToast } from './ToastContext';

function CategoriesPanel({ categories, onCategoriesChanged }) {
  // Local form state for the "add category" form.
  const [name, setName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const { showToast } = useToast();

  // Basic client-side validation mirroring (not replacing) the server's
  // rules, so the user gets instant feedback before a round trip.
  function validate() {
    const errors = {};
    if (!name.trim()) {
      errors.name = 'Category name is required.';
    }
    if (monthlyBudget !== '' && (Number.isNaN(Number(monthlyBudget)) || Number(monthlyBudget) <= 0)) {
      errors.monthlyBudget = 'Monthly budget must be a positive number if provided.';
    }
    return errors;
  }

  // Handles the "Add category" form submission: validates, calls the API,
  // resets the form on success, and shows a toast on either outcome.
  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await createCategory({
        name: name.trim(),
        monthlyBudget: monthlyBudget === '' ? null : Number(monthlyBudget),
      });
      setName('');
      setMonthlyBudget('');
      setFieldErrors({});
      showToast('Category created.', 'success');
      await onCategoriesChanged();
    } catch (err) {
      // Server-side validation errors come back as err.details (per field).
      if (err.details) {
        setFieldErrors(err.details);
      }
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handles deleting a category. The backend enforces "can't delete a
  // category that still has expenses" - we just relay whatever message it
  // sends back.
  async function handleDelete(category) {
    if (!window.confirm(`Delete category "${category.name}"? This cannot be undone.`)) {
      return;
    }
    setDeletingId(category.id);
    try {
      await deleteCategory(category.id);
      showToast('Category deleted.', 'success');
      await onCategoriesChanged();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="panel">
      <h2>Categories</h2>

      <form className="inline-form" onSubmit={handleSubmit} noValidate>
        <div className="form-field">
          <label htmlFor="category-name">Name</label>
          <input
            id="category-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Travel"
          />
          {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="category-budget">Monthly budget (optional)</label>
          <input
            id="category-budget"
            type="number"
            step="0.01"
            min="0.01"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            placeholder="e.g. 500"
          />
          {fieldErrors.monthlyBudget && <span className="field-error">{fieldErrors.monthlyBudget}</span>}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding…' : 'Add category'}
        </button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Monthly budget</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {categories.length === 0 && (
            <tr>
              <td colSpan={3} className="empty-row">
                No categories yet. Add one above.
              </td>
            </tr>
          )}
          {categories.map((category) => (
            <tr key={category.id}>
              <td>{category.name}</td>
              <td>{category.monthlyBudget !== null ? `$${Number(category.monthlyBudget).toFixed(2)}` : '—'}</td>
              <td>
                <button
                  className="link-button danger"
                  onClick={() => handleDelete(category)}
                  disabled={deletingId === category.id}
                >
                  {deletingId === category.id ? 'Deleting…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CategoriesPanel;
