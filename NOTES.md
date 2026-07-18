# NOTES.md — Reflection

### 1. Which parts did you build with AI assistance, and where did you have to correct, override, or rewrite what it produced?

The whole scaffold — schema, Express routes/controllers/middleware, and the
React components — was drafted with AI assistance in one pass, then
compiled and exercised against a real local PostgreSQL instance (`npm run
db:setup`, then a full curl-based smoke test of every endpoint: create,
list with filters, update, delete, the 409-on-delete-with-expenses path,
and validation failures) to catch mistakes rather than trusting the output
blind. A few things needed correcting during that pass:
- The first draft of the summary query used a `WHERE` clause for the
  optional month filter, which silently dropped categories with zero
  expenses in that month from the results. Moved the date filter into the
  `LEFT JOIN ... ON` condition instead so every category always appears,
  even at $0.
- The delete-category behavior needed a deliberate decision, not just
  "whatever's easiest" — see question 2's schema note.
- Pagination math (`totalPages`, off-by-one on `OFFSET`) was verified by
  hand against actual seeded rows rather than assumed correct.
- Date validation initially accepted values like `2026-02-30` via naive
  `new Date()` parsing (JS silently rolls them over to March); rewrote it
  to validate the exact YYYY-MM-DD components against a real calendar date.

### 2. Briefly describe your database schema and one tradeoff you made in designing it.

Two related tables: `categories` (id, name, optional `monthly_budget`) and
`expenses` (id, amount, description, `category_id` FK, `expense_date`).
Indexes on `category_id`, `expense_date`, and the composite
`(category_id, expense_date)` support the app's actual query patterns
(filter by category, filter/sort by date, or both together).

**Tradeoff:** the `category_id` foreign key uses `ON DELETE RESTRICT`
instead of `CASCADE` or `SET NULL`. This means deleting a category that
still has expenses is *rejected* by the database (surfaced to the user as
a 409 with a clear message) rather than silently deleting those expenses
(`CASCADE`) or silently detaching them into an "uncategorized" limbo
(`SET NULL`). The cost is one extra step for the user (reassign or delete
the expenses first); the benefit is that historical spend data can never
disappear as a side effect of a category cleanup, which matters more for a
shared expense ledger than for the convenience of a one-click delete.

### 3. What would break first if this app had to handle ~1,000,000 expenses, and what would you change?

The list endpoint would still hold up reasonably well since it's already
indexed and paginated (`LIMIT`/`OFFSET`), but `OFFSET` pagination itself
gets slower the deeper a user pages in, because Postgres still has to scan
and discard every preceding row. At that scale I'd switch to **keyset
(cursor) pagination** — `WHERE (expense_date, id) < (last_seen_date,
last_seen_id) ORDER BY expense_date DESC, id DESC LIMIT n` — which stays
fast regardless of page depth. The summary endpoint's `GROUP BY` over the
full table would also start to cost more per request; at real scale I'd
either add a `(category_id, expense_date)` covering index tuned to that
exact aggregation, or maintain a pre-aggregated `category_monthly_totals`
table updated via a trigger/scheduled job so the summary view reads from a
small table instead of aggregating a million rows live. The connection
pool (`max: 10`) would also need tuning/monitoring under real concurrent
load.

### 4. What did you deliberately simplify or leave out given the time limit, and why?

- **No authentication/multi-team support** — the brief explicitly says to
  assume a single hardcoded team, so I didn't build user accounts, sessions,
  or a `team_id` column. Adding real multi-tenancy later would mean adding
  a `teams` table and a `team_id` FK on both existing tables, plus an auth
  layer in front of every route.
- **No automated test suite** — I verified every endpoint and UI flow
  manually (curl for the API, a full click-through in the browser) rather
  than writing Jest/RTL tests, to stay inside the ~2 hour time box. The
  `npm test` scripts exist as placeholders that exit cleanly rather than
  failing a fresh clone.
- **No DB migration framework** — `schema.sql` is a single drop-and-recreate
  script rather than versioned migrations (e.g. via `node-pg-migrate`).
  Fine for a from-scratch project this size; a real production app with
  existing data would need actual migrations.
- **No edit history / audit log** on expenses — updates overwrite in place.
  Reasonable for a small team tool where the current numbers matter more
  than who changed what and when.
- **No currency/multi-currency handling** — everything is a single implicit
  currency, since the brief doesn't ask for more.
