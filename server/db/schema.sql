-- =============================================================================
-- server/db/schema.sql
-- Defines the relational schema for the Team Expense Tracker.
-- Run this once against a fresh database before seeding data.
-- Two related tables: categories (parent) and expenses (child, FK to category).
-- =============================================================================

-- Drop existing tables first so this script is safely re-runnable during
-- development. Order matters: expenses references categories, so it must be
-- dropped first to avoid a foreign-key error.
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS categories;

-- -----------------------------------------------------------------------------
-- Table: categories
-- Holds the list of expense categories the team can log spending against.
-- Each category optionally has a monthly budget used by the summary view to
-- flag overspending.
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
    -- Surrogate primary key, auto-incrementing.
    id              SERIAL PRIMARY KEY,

    -- Human-readable category name, e.g. "Travel", "Office Supplies".
    -- UNIQUE prevents accidental duplicate categories with the same name.
    -- NOT NULL + CHECK guards against empty-string names slipping through.
    name            VARCHAR(100) NOT NULL UNIQUE CHECK (btrim(name) <> ''),

    -- Optional monthly budget ceiling for this category, in the same currency
    -- unit as expenses.amount. NULL means "no budget set" (never flagged as
    -- over budget). When present it must be a positive number.
    monthly_budget  NUMERIC(12, 2) CHECK (monthly_budget IS NULL OR monthly_budget > 0),

    -- Bookkeeping timestamp, defaults to the moment the row is inserted.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: expenses
-- Each row is a single shared team expense tied to exactly one category.
-- -----------------------------------------------------------------------------
CREATE TABLE expenses (
    -- Surrogate primary key, auto-incrementing.
    id              SERIAL PRIMARY KEY,

    -- Monetary amount of the expense. NUMERIC (not FLOAT) avoids floating
    -- point rounding errors on money. CHECK enforces "no negative or zero
    -- amounts" per the assignment's server-side validation requirement.
    amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),

    -- Free-text description of what the expense was for.
    -- NOT NULL + CHECK guards against blank descriptions.
    description     VARCHAR(500) NOT NULL CHECK (btrim(description) <> ''),

    -- Foreign key linking this expense to its category.
    -- ON DELETE RESTRICT is the deliberate design choice for "what happens
    -- when a category with expenses is deleted": the database refuses the
    -- delete rather than silently orphaning or cascading. This protects
    -- historical spend data from ever being deleted by accident just
    -- because someone deletes a category. The API translates the resulting
    -- FK violation into a friendly 409 Conflict response (see
    -- categories.controller.js) so the user can archive/reassign first.
    category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,

    -- The calendar date the expense was incurred (not the date it was
    -- logged into the system). DATE type keeps time-of-day out of date
    -- range filtering.
    expense_date    DATE NOT NULL,

    -- Bookkeeping timestamp of when the row was created in the system.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- Support the filtering/sorting patterns the API actually performs:
-- filter by category, filter/sort by date range, and paginate newest-first.
-- -----------------------------------------------------------------------------
CREATE INDEX idx_expenses_category_id   ON expenses(category_id);
CREATE INDEX idx_expenses_expense_date  ON expenses(expense_date);
-- Composite index speeds up the common "category + date range, newest first"
-- query used by the list endpoint's WHERE + ORDER BY together.
CREATE INDEX idx_expenses_cat_date      ON expenses(category_id, expense_date DESC);
