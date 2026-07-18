/**
 * client/src/App.jsx
 * -----------------------------------------------------------------------------
 * Top-level component. Owns:
 *   - the list of categories (fetched once, shared by every tab that needs
 *     it: the expense form, the expense filter, and category management)
 *   - which tab is active (Expenses / Categories / Summary)
 *   - which expense (if any) is being edited
 *   - a `refreshToken` counter that panels watch to know when to re-fetch
 *     after a mutation happened in a sibling panel
 *
 * No authentication: per the assignment, this app assumes a single
 * hardcoded team with no login screen.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { getCategories, createExpense, updateExpense, deleteExpense } from './api/client';
import { useToast } from './components/ToastContext';
import CategoriesPanel from './components/CategoriesPanel';
import ExpenseForm from './components/ExpenseForm';
import ExpensesPanel from './components/ExpensesPanel';
import SummaryPanel from './components/SummaryPanel';

const TABS = ['Expenses', 'Categories', 'Summary'];

function App() {
  const [activeTab, setActiveTab] = useState('Expenses');
  const [categories, setCategories] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  // Bumping this number tells child panels "something changed elsewhere,
  // re-fetch your data" without needing a full global state library for
  // a small app like this.
  const [refreshToken, setRefreshToken] = useState(0);

  const { showToast } = useToast();

  // Loads the category list from the API. Used on initial mount and again
  // any time a category is created/deleted (see CategoriesPanel's
  // onCategoriesChanged prop).
  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [showToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Called by ExpenseForm on submit for both create and edit. `id` is null
  // when adding a new expense, or the expense id when editing.
  async function handleSaveExpense(id, payload) {
    if (id) {
      await updateExpense(id, payload);
      setEditingExpense(null);
    } else {
      await createExpense(payload);
    }
    // Tell ExpensesPanel and SummaryPanel to re-fetch so the new/updated
    // totals show up immediately.
    setRefreshToken((token) => token + 1);
  }

  // Called by ExpensesPanel when the user confirms a delete.
  async function handleDeleteExpense(id) {
    try {
      await deleteExpense(id);
      showToast('Expense deleted.', 'success');
      setRefreshToken((token) => token + 1);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Team Expense Tracker</h1>
        <p className="app-subtitle">Shared expenses for the team - no login required.</p>
      </header>

      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'Expenses' && (
          <>
            <ExpenseForm
              categories={categories}
              editingExpense={editingExpense}
              onSave={handleSaveExpense}
              onCancelEdit={() => setEditingExpense(null)}
            />
            <ExpensesPanel
              categories={categories}
              editingId={editingExpense ? editingExpense.id : null}
              onEdit={setEditingExpense}
              onDelete={handleDeleteExpense}
              refreshToken={refreshToken}
            />
          </>
        )}

        {activeTab === 'Categories' && (
          <CategoriesPanel categories={categories} onCategoriesChanged={loadCategories} />
        )}

        {activeTab === 'Summary' && <SummaryPanel refreshToken={refreshToken} />}
      </main>
    </div>
  );
}

export default App;
