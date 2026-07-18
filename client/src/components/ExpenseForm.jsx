/**
 * client/src/components/ExpenseForm.jsx
 * -----------------------------------------------------------------------------
 * A form for creating a new expense OR editing an existing one, depending
 * on whether `editingExpense` is provided. Kept as one component (instead
 * of separate Add/Edit forms) since the fields and validation are
 * identical - only the submit action and initial values differ.
 *
 * Props:
 *   categories      - array of categories to populate the <select>.
 *   editingExpense  - the expense object being edited, or null when adding.
 *   onSave          - async (id | null, payload) => void. Called on submit.
 *   onCancelEdit    - called when the user cancels an in-progress edit.
 */

import React, { useEffect, useState } from 'react';
import { useToast } from './ToastContext';

// Today's date in YYYY-MM-DD, used as the default value for new expenses.
function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function ExpenseForm({ categories, editingExpense, onSave, onCancelEdit }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseDate, setExpenseDate] = useState(todayIsoDate());
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  // When editingExpense changes (user clicked "Edit" on a row, or clicked
  // "Cancel"), sync the form fields to match. This lets the same form
  // instance smoothly switch between "add" and "edit" modes.
  useEffect(() => {
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setDescription(editingExpense.description);
      setCategoryId(String(editingExpense.categoryId));
      setExpenseDate(editingExpense.expenseDate);
    } else {
      setAmount('');
      setDescription('');
      setCategoryId(categories[0] ? String(categories[0].id) : '');
      setExpenseDate(todayIsoDate());
    }
    setFieldErrors({});
  }, [editingExpense, categories]);

  // Client-side validation mirroring the server's rules (see
  // server/src/middleware/validators.js) for immediate inline feedback.
  function validate() {
    const errors = {};
    const numericAmount = Number(amount);
    if (amount === '' || Number.isNaN(numericAmount)) {
      errors.amount = 'Amount is required and must be a number.';
    } else if (numericAmount <= 0) {
      errors.amount = 'Amount must be greater than zero.';
    }
    if (!description.trim()) {
      errors.description = 'Description is required.';
    }
    if (!categoryId) {
      errors.categoryId = 'Please choose a category.';
    }
    if (!expenseDate) {
      errors.expenseDate = 'Date is required.';
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSave(editingExpense ? editingExpense.id : null, {
        amount: Number(amount),
        description: description.trim(),
        categoryId: Number(categoryId),
        expenseDate,
      });
      showToast(editingExpense ? 'Expense updated.' : 'Expense added.', 'success');
      if (!editingExpense) {
        // Reset only for "add" mode; edit mode exits via onCancelEdit after save.
        setAmount('');
        setDescription('');
        setExpenseDate(todayIsoDate());
      }
    } catch (err) {
      if (err.details) {
        setFieldErrors(err.details);
      }
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="panel expense-form" onSubmit={handleSubmit} noValidate>
      <h2>{editingExpense ? 'Edit expense' : 'Add an expense'}</h2>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="expense-amount">Amount ($)</label>
          <input
            id="expense-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
          {fieldErrors.amount && <span className="field-error">{fieldErrors.amount}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="expense-date">Date</label>
          <input
            id="expense-date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
          {fieldErrors.expenseDate && <span className="field-error">{fieldErrors.expenseDate}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="expense-category">Category</label>
          <select id="expense-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select a category…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && <span className="field-error">{fieldErrors.categoryId}</span>}
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="expense-description">Description</label>
        <input
          id="expense-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this expense for?"
        />
        {fieldErrors.description && <span className="field-error">{fieldErrors.description}</span>}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting || categories.length === 0}>
          {isSubmitting ? 'Saving…' : editingExpense ? 'Save changes' : 'Add expense'}
        </button>
        {editingExpense && (
          <button type="button" className="secondary" onClick={onCancelEdit} disabled={isSubmitting}>
            Cancel
          </button>
        )}
      </div>
      {categories.length === 0 && (
        <p className="hint">Create a category first before adding an expense.</p>
      )}
    </form>
  );
}

export default ExpenseForm;
