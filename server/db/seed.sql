-- =============================================================================
-- server/db/seed.sql
-- Populates the freshly-created schema with a few realistic test records so
-- the app is usable immediately after setup. Safe to re-run: it clears the
-- two tables first (child before parent, to respect the FK) and re-inserts.
-- =============================================================================

TRUNCATE TABLE expenses RESTART IDENTITY CASCADE;
TRUNCATE TABLE categories RESTART IDENTITY CASCADE;

-- ---- Categories -------------------------------------------------------------
-- A mix of categories with and without a monthly budget, so the summary
-- view's "over budget" flag and "no budget set" states are both visible
-- right after seeding.
INSERT INTO categories (name, monthly_budget) VALUES
    ('Travel',          1500.00),
    ('Office Supplies', 300.00),
    ('Software & Tools', 500.00),
    ('Team Meals',      200.00),
    ('Miscellaneous',   NULL);

-- ---- Expenses -----------------------------------------------------------
-- Deliberately includes: multiple categories, a spread of dates within the
-- current-ish window, and at least one category (Team Meals) that exceeds
-- its monthly budget so the "over budget" flag is demonstrable out of the box.
INSERT INTO expenses (amount, description, category_id, expense_date) VALUES
    (450.00, 'Flight to client site - SFO to JFK',        1, '2026-07-02'),
    (220.50, 'Hotel - 2 nights for conference',            1, '2026-07-03'),
    (89.99,  'Notebooks and pens for the office',          2, '2026-07-05'),
    (145.00, 'Replacement keyboards (x3)',                 2, '2026-07-08'),
    (59.00,  'Figma team seats - monthly',                 3, '2026-07-01'),
    (120.00, 'GitHub Team plan - monthly',                 3, '2026-07-01'),
    (95.50,  'Team lunch - sprint planning',                4, '2026-07-04'),
    (110.25, 'Team dinner - project kickoff',               4, '2026-07-10'),
    (60.00,  'Team lunch - retro celebration',               4, '2026-07-15'),
    (35.00,  'Office plant and misc supplies',              5, '2026-07-06'),
    (18.75,  'Parking during client visit',                 1, '2026-06-20'),
    (42.00,  'Printer paper and toner',                     2, '2026-06-18');
