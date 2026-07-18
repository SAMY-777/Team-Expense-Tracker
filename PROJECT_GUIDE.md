# Team Expense Tracker — Project Guide

## 1. PROJECT OVERVIEW

Team Expense Tracker is a small full-stack PERN application that lets a
single team log shared expenses, organize them into categories with
optional monthly budgets, and view a spending summary that flags
categories that have gone over budget.

**Architecture summary:** a React single-page app (built with Vite) talks
to a stateless Express REST API over JSON/HTTP. The API is the only thing
that talks to PostgreSQL — the frontend never touches the database
directly. All business rules (validation, aggregation, the
delete-category-with-expenses policy) live in the backend, so the API is
the single source of truth regardless of which client calls it.

```
 ┌─────────────┐        HTTP/JSON        ┌──────────────┐        SQL        ┌──────────────┐
 │   React      │  ───────────────────▶  │   Express     │  ──────────────▶  │  PostgreSQL   │
 │  (Vite, :5173)│  ◀───────────────────  │  API (:5000)  │  ◀──────────────  │   (:5432)     │
 └─────────────┘                         └──────────────┘                   └──────────────┘
```

**Tech stack:**

| Layer          | Technology                  | Notes |
|----------------|------------------------------|-------|
| Frontend       | React 18 + Vite 5            | No UI framework — plain CSS, kept minimal per the brief |
| Backend        | Node.js 18+ / Express 4      | REST API under `/api/*` |
| Database       | PostgreSQL 14+ (tested on 16)| Two related tables, indexed, aggregation done in SQL |
| DB driver      | `pg` (node-postgres)         | Connection pooling |
| Dev tooling    | `nodemon`, Vite dev server   | Hot reload for both sides |
| Containerization | Docker + docker-compose    | One-command full-stack startup |

**Core user stories completed:**
- As a team member, I can add an expense with an amount, description,
  category, and date.
- As a team member, I can see a list of expenses and filter it by category
  and/or a date range, paginated so the list stays fast at scale.
- As a team member, I can edit or delete an existing expense.
- As a team member, I can create categories and give them an optional
  monthly budget, and see them all listed.
- As a team member, I can see total spend per category, with any category
  that's over its monthly budget clearly flagged.
- As a team member, I get clear inline error messages if I submit invalid
  data (negative amount, missing fields, bad date), both instantly in the
  UI and enforced again on the server.

**Ideal deployment platforms for this stack:**
- **Frontend:** Vercel, Netlify, or Cloudflare Pages (static Vite build output).
- **Backend:** Render, Railway, Fly.io, or a small AWS/DigitalOcean droplet
  running the provided Dockerfile.
- **Database:** managed Postgres — Render Postgres, Railway Postgres,
  Supabase, Neon, or AWS RDS.
- **All three together:** the included `docker-compose.yml` also works
  as-is on any single VM/host that can run Docker.

---

## 2. FOLDER STRUCTURE

```
team-expense-tracker/
├── README.md                    # Quick summary + pointer to this guide
├── PROJECT_GUIDE.md              # This file — full documentation
├── NOTES.md                      # Assignment reflection question answers
├── docker-compose.yml            # Runs db + server + client together
├── .gitignore                    # Excludes node_modules, .env, build output
│
├── server/                       # Express + PostgreSQL backend
│   ├── package.json              # Backend deps + npm scripts (dev/start/db:*)
│   ├── Dockerfile                # Production image for the API
│   ├── .env.example              # Documented backend environment variables
│   ├── db/
│   │   ├── schema.sql            # CREATE TABLE for categories + expenses
│   │   ├── seed.sql              # Realistic sample rows for local dev
│   │   └── runSql.js             # CLI helper: runs a .sql file against Postgres
│   └── src/
│       ├── server.js             # Entry point — loads .env, starts listen()
│       ├── app.js                # Express app: middleware, routes, error handler
│       ├── config/
│       │   └── db.js             # PostgreSQL connection pool (pg.Pool)
│       ├── routes/
│       │   ├── health.routes.js       # GET /api/health
│       │   ├── categories.routes.js   # /api/categories CRUD routes
│       │   ├── expenses.routes.js     # /api/expenses CRUD routes
│       │   └── summary.routes.js      # GET /api/summary
│       ├── controllers/
│       │   ├── categories.controller.js  # Category business logic + SQL
│       │   ├── expenses.controller.js    # Expense business logic + SQL
│       │   └── summary.controller.js     # SQL aggregation for the summary view
│       ├── middleware/
│       │   ├── validators.js     # Server-side request validation
│       │   └── errorHandler.js   # Centralized error → HTTP response mapping
│       └── utils/
│           ├── ApiError.js       # Custom error class carrying an HTTP status
│           └── asyncHandler.js   # Wraps async routes so errors reach errorHandler
│
└── client/                       # React (Vite) frontend
    ├── package.json              # Frontend deps + npm scripts (dev/build/preview)
    ├── Dockerfile                # Multi-stage build → served by nginx
    ├── vite.config.js            # Vite + React plugin config, dev port 5173
    ├── index.html                # HTML shell Vite mounts React into
    ├── .env.example              # Documented frontend environment variables
    └── src/
        ├── main.jsx               # React entry point — mounts <App />
        ├── App.jsx                # Top-level component: tabs + shared state
        ├── api/
        │   └── client.js          # fetch() wrapper for every backend endpoint
        ├── components/
        │   ├── ErrorBoundary.jsx  # Catches render-time errors, friendly fallback
        │   ├── ToastContext.jsx   # Global toast notifications (success/error)
        │   ├── ExpenseForm.jsx    # Add/edit expense form
        │   ├── ExpensesPanel.jsx  # Expense list: filters + pagination + actions
        │   ├── CategoriesPanel.jsx# Category list + create + delete
        │   └── SummaryPanel.jsx   # Per-category totals + over-budget flags
        └── styles/
            └── index.css          # Minimal, responsive global styling
```

---

## 3. HOW TO RUN THIS PROJECT

### Prerequisites

- **Node.js 18 or newer** (check with `node -v`)
- **PostgreSQL 14+** installed and running locally, *or* Docker installed
  if you'd rather use `docker compose` (see the quick path below).
- `npm` (ships with Node.js)

### Option A — One command with Docker (recommended)

```bash
git clone <your-repo-url> team-expense-tracker
cd team-expense-tracker
docker compose up --build
```

This starts PostgreSQL, runs the schema + seed scripts automatically, and
starts both the API (port 5000) and the frontend (port 5173). Open
**http://localhost:5173** once the logs settle.

### Option B — Running it manually

**Step 1 — Clone the repo**
```bash
git clone <your-repo-url> team-expense-tracker
cd team-expense-tracker
```

**Step 2 — Create the database**
```bash
# Using the psql CLI (adjust user if needed):
createdb team_expense_tracker
# or, from inside psql:
# CREATE DATABASE team_expense_tracker;
```

**Step 3 — Configure and install the backend**
```bash
cd server
cp .env.example .env
# Open .env and set PGUSER / PGPASSWORD to match your local Postgres.
npm install
```

**Step 4 — Set up the database schema and seed data**
```bash
npm run db:setup
# This runs: db:schema (creates tables) then db:seed (inserts sample rows).
```

**Step 5 — Start the backend**
```bash
npm run dev
# API now running at http://localhost:5000
# Verify it's alive: curl http://localhost:5000/api/health
```

**Step 6 — Configure, install, and start the frontend** (in a new terminal)
```bash
cd client
cp .env.example .env
npm install
npm run dev
# Frontend now running at http://localhost:5173
```

**Step 7 — Open the app**

Visit **http://localhost:5173** in your browser. No login is required —
there's a single hardcoded team.

### Click-by-click feature test

1. **Add a category:** go to the *Categories* tab → fill in "Name" (e.g.
   `Marketing`) and an optional "Monthly budget" (e.g. `400`) → *Add
   category*. It appears in the table below immediately.
2. **Add an expense:** go to the *Expenses* tab → fill in Amount,
   Date, Category, Description → *Add expense*. It appears at the top of
   the list (sorted newest-first).
3. **Filter expenses:** use the Category dropdown and/or the From/To date
   inputs above the table — the list re-fetches automatically. Click
   *Clear filters* to reset.
4. **Paginate:** with more than 10 expenses, use the *Previous*/*Next*
   buttons under the table.
5. **Edit an expense:** click *Edit* on any row — the form above switches
   to edit mode, pre-filled. Change a value → *Save changes* (or *Cancel*
   to back out without saving).
6. **Delete an expense:** click *Delete* on a row, confirm the prompt.
7. **View the summary:** go to the *Summary* tab. Pick a month (defaults
   to the current month) or check "Show all-time totals". Any category
   whose total exceeds its monthly budget shows a red **Over budget**
   badge.
8. **Try deleting a category that has expenses:** go to *Categories* →
   *Delete* on a category that's in use → you'll see a toast explaining
   the category still has expenses linked to it and the delete is
   rejected (this is a deliberate design choice — see NOTES.md §2).
9. **Try invalid input:** on the Expenses form, enter `0` or a negative
   number for Amount, or leave Description blank, and submit — inline
   field errors appear without a round trip failing silently.

No test credentials are needed anywhere in this app.

---

## 4. HOW THE PROJECT WAS BUILT (Step-by-Step Story)

**Phase 1 — Environment & folder setup.** Started by creating the
top-level `server/` and `client/` split so the two halves of the stack
never share dependencies or config, which keeps deployment independent
(the API and the frontend can be deployed to entirely different platforms
with no coupling beyond one HTTP URL).

**Phase 2 — Database schema first.** Before writing a single line of
Express code, `db/schema.sql` was designed: two tables, `categories` and
`expenses`, with `expenses.category_id` as a foreign key. Designing the
schema first — rather than letting the API shape drive it — meant the data
integrity rules (positive amounts, non-blank names, the delete-restriction
policy) could be enforced at the database level via `CHECK` constraints and
`ON DELETE RESTRICT`, as a second line of defense behind the application's
own validation. A `seed.sql` script was written alongside it so there was
always realistic data to develop against instead of an empty database.

**Phase 3 — Backend, one layer at a time.** The backend was built
bottom-up: first the connection pool (`config/db.js`), then small reusable
utilities (`ApiError`, `asyncHandler`) that every route would lean on,
then the validation middleware, then controllers (the actual SQL and
business logic), and finally the routes that wire it all together. The
health-check route (`GET /api/health`) was one of the very first things
built and tested, specifically so there was an immediate, simple way to
confirm "is the server up and can it reach the database" before building
anything more complex on top of it. Each controller was tested directly
with `curl` against a real local PostgreSQL instance as it was written —
including deliberately-invalid requests (negative amounts, bad dates,
deleting a category still in use) to confirm the error paths worked, not
just the happy path.

**Phase 4 — Frontend, feature by feature, wired to the real API.** The
React app was built by feature rather than by file type: first the generic
plumbing (the `api/client.js` fetch wrapper, the toast notification
system, the error boundary), then the Categories panel (the simplest CRUD
surface), then the Expense form + list together (since editing an expense
reuses the same form as adding one), then the Summary view last, since it
depends on data existing in the other two. Every panel was checked against
the live backend, not a mock, from the first line of frontend code — the
`.env.example` for the client points at `http://localhost:5000/api` by
default so this "just works" locally.

**Phase 5 — Full-stack verification, then documentation & deployment
config.** With both halves running together, a full click-through test was
done covering every required feature (add/edit/delete an expense, filter
by category and date range, paginate, create/delete categories including
the blocked-delete case, and check the summary's over-budget flag), plus a
production `vite build` to catch any compile-time errors before writing
the Dockerfiles, `docker-compose.yml`, and this documentation.

---

## 5. KEY CONCEPTS TO BE ABLE TO EXPLAIN

**REST API design.** The backend exposes resources (`/api/expenses`,
`/api/categories`, `/api/summary`) as URLs, and the HTTP verb (GET, POST,
PUT, DELETE) expresses the action on that resource. This app follows that
convention consistently, so the URL + verb combination alone tells you
what a request does without reading its body.

**Middleware (Express).** A middleware function is anything with the
signature `(req, res, next)` that Express calls in order for a matching
route. This app uses middleware for three distinct jobs: parsing JSON
bodies (`express.json()`), validating a request before it reaches the
controller (`validators.js`), and catching errors at the end of the chain
(`errorHandler.js`, recognized by its 4-argument signature).

**CORS (Cross-Origin Resource Sharing).** Browsers block a page served
from one origin (`localhost:5173`) from calling an API on a different
origin (`localhost:5000`) unless that API explicitly allows it. The `cors`
middleware in `app.js` whitelists `CLIENT_ORIGIN` from the environment so
only the intended frontend can call the API from a browser.

**Connection pooling.** Opening a new PostgreSQL connection per request is
slow and doesn't scale. `pg.Pool` keeps a small set of open connections
and hands them out to whichever query needs one, reusing them afterward —
this is what `config/db.js` sets up once and every controller shares.

**SQL aggregation vs. application-level aggregation.** The summary
endpoint uses `SUM()`, `COUNT()`, and `GROUP BY` directly in the SQL query
rather than fetching every expense row and adding them up in JavaScript.
The database is far better optimized for this (it can use indexes and
never has to serialize thousands of rows over the network just to throw
away everything except a total).

**Foreign keys and referential actions.** `expenses.category_id
REFERENCES categories(id)` guarantees an expense can never point at a
category that doesn't exist. `ON DELETE RESTRICT` further says "don't even
allow deleting a category if rows still reference it" — one of several
possible referential actions (the others being `CASCADE`, which would
delete the expenses too, and `SET NULL`, which would detach them).

**Indexing.** An index lets Postgres jump straight to matching rows
instead of scanning the whole table. This app indexes `category_id` and
`expense_date` (and a composite of both) because those are exactly the
columns the list and filter queries search and sort by.

**Pagination (LIMIT/OFFSET).** Rather than returning every expense in one
response, the list endpoint returns a fixed-size page (`LIMIT`) starting
at a calculated position (`OFFSET`), plus a total count, so the frontend
can render "Page 2 of 5" and the response stays small no matter how much
data exists.

**Client-side state management (React hooks).** This app uses only React's
built-in `useState`/`useEffect`/`useCallback` — no Redux or other external
state library. State is lifted to the nearest common parent that needs it
(e.g. `categories` lives in `App.jsx` because three different panels need
it), and a simple `refreshToken` counter is used to tell sibling
components "something changed, re-fetch" without a full state-management
framework.

**Error boundaries vs. try/catch.** A React error boundary
(`ErrorBoundary.jsx`) only catches errors thrown *during rendering*. Errors
from async operations like a failed `fetch()` call don't trigger it — those
are caught with ordinary `try/catch` in each component and surfaced via
the toast system instead.

**MVC-ish layering in the backend.** Although this Express app doesn't use
the literal MVC naming, it follows the same separation: **routes** define
the URL/verb → handler mapping (analogous to a router), **controllers**
contain the logic and database queries (analogous to the model +
controller combined, since there's no separate ORM model layer here), and
the **views** are simply the JSON responses the frontend consumes.

---

## 6. POSSIBLE INTERVIEW QUESTIONS & SHORT ANSWERS

**Q1. Why did you choose `ON DELETE RESTRICT` instead of `CASCADE` for the
expenses → categories foreign key?**
A: Cascading would silently delete a team's historical spend data as a
side effect of a category cleanup, and `SET NULL` would leave expenses
orphaned with no category. `RESTRICT` forces an explicit decision (move or
delete those expenses first) before a category can be removed, which is
safer for a shared financial ledger where losing data unintentionally is
worse than one extra confirmation step.

**Q2. Where exactly does the "amount must be positive" rule get enforced,
and why in more than one place?**
A: In three places: an HTML `min`/`type="number"` hint in the React form
(UX only), the `validateExpense` Express middleware (the real gatekeeper,
returns a 400 before the controller runs), and a `CHECK (amount > 0)`
constraint in the database schema itself. The middleware is what actually
protects the app; the DB constraint is a last-resort safety net in case
some other code path ever bypasses the API layer.

**Q3. How does the summary endpoint compute totals without loading every
expense into Node.js?**
A: It runs one SQL query with `LEFT JOIN`, `SUM(e.amount)`, `COUNT(e.id)`,
and `GROUP BY c.id` — PostgreSQL does the aggregation server-side and
returns one row per category. Node.js just forwards that already-computed
result as JSON.

**Q4. Why `LEFT JOIN` instead of an inner `JOIN` in the summary query?**
A: An inner join would silently drop any category that has zero expenses
(or zero expenses in the selected month) from the results. `LEFT JOIN`
keeps every category and uses `COALESCE(SUM(...), 0)` to turn "no matching
rows" into an explicit `0` total.

**Q5. How is pagination implemented, and what's its weak point at very
large scale?**
A: `LIMIT`/`OFFSET` on the query, with a separate `COUNT(*)` query (same
filters, no limit) to compute total pages. Its weak point: `OFFSET` still
makes Postgres scan and discard every row before the offset, so page 5000
is meaningfully slower than page 1. Keyset/cursor pagination fixes this at
scale (see NOTES.md §3).

**Q6. Why is there a separate `ApiError` class instead of just calling
`res.status(400).json(...)` directly in controllers?**
A: It lets a controller simply `throw new ApiError(404, '...')` and stop
executing immediately, with the centralized `errorHandler` middleware
deciding how to format the response. This keeps controllers focused on
business logic rather than repeating response-formatting code, and
guarantees every error — expected or not — goes through the same funnel.

**Q7. What does `asyncHandler` actually do, and why is it necessary in
Express 4?**
A: Express 4 doesn't automatically catch a rejected promise thrown inside
an `async` route handler — an unhandled rejection would hang the request
instead of reaching error-handling middleware. `asyncHandler` wraps the
handler so any rejection is passed to `next(err)` automatically, avoiding
a repeated `try { ... } catch (err) { next(err) }` in every controller.

**Q8. How do you distinguish "the request was malformed" from "the
category doesn't exist" when creating an expense?**
A: `validateExpense` middleware checks that `categoryId` is a well-formed
positive integer (a 400 if not). The controller then separately queries
whether that id actually exists in `categories` and throws a 404 if not.
Those are different failure modes and deserve different status codes.

**Q9. Why does the frontend re-validate fields that the backend already
validates?**
A: For instant feedback — a user shouldn't have to wait on a network round
trip to learn they left the description blank. But the frontend validation
is a UX convenience only; the backend validation in `validators.js` is
what actually protects the data, since a client-side check can always be
bypassed (browser dev tools, a different client, curl).

**Q10. Explain the `refreshToken` pattern used in `App.jsx`.**
A: It's a plain integer in `App.jsx` state that gets incremented after any
mutation (add/edit/delete an expense). `ExpensesPanel` and `SummaryPanel`
both include it as a `useEffect` dependency, so bumping it triggers both
to re-fetch fresh data — without needing prop drilling of the actual
updated data or a global state library for an app this size.

**Q11. Why use `NUMERIC(12,2)` for `amount` instead of a floating-point
type?**
A: Floating-point types (`FLOAT`/`REAL`/JS `Number` internally) can't
represent all decimal fractions exactly, which causes rounding errors that
are unacceptable for money (e.g. summing many `0.1`-like values can drift).
`NUMERIC` stores an exact decimal value, so totals always add up correctly
to the cent.

**Q12. What happens if two people submit an expense at the exact same
time — is there a race condition?**
A: Each `POST /api/expenses` request is a single `INSERT` handled
independently by Postgres, which serializes writes at the row level — there's
no shared in-memory state in Node.js being mutated, so concurrent creates
are safe. The one place a race could theoretically matter is the unique
category name constraint, which Postgres itself enforces atomically (a
second concurrent insert of the same name fails with a 23505 unique
violation, which `errorHandler.js` turns into a 409).

**Q13. Why is validation for dates stricter than just `new Date(string)`?**
A: JavaScript's `Date` constructor silently "rolls over" invalid dates —
`new Date('2026-02-30')` becomes March 2nd instead of throwing. The
`isRealDate` helper in `validators.js` explicitly re-checks that the
year/month/day the user typed match the year/month/day the resulting
`Date` object reports, catching that class of silent-corruption bug.

**Q14. How would you add authentication to this app later without a
rewrite?**
A: Add a `users`/`teams` table, a `team_id` foreign key on `categories`
and `expenses`, an auth middleware (e.g. JWT verification) that sets
`req.teamId`, and thread `team_id` into every existing query's `WHERE`
clause. Because all queries already live in a handful of controller
functions rather than being scattered across the codebase, this is a
localized change, not a rewrite.

**Q15. Why Vite instead of Create React App for the frontend?**
A: Create React App is effectively unmaintained at this point; Vite offers
much faster cold-start and hot-module-reload during development (native
ES modules instead of bundling everything up front) and produces a
comparably optimized production build via Rollup under the hood — it's the
current standard recommendation for a plain React SPA.

**Q16. Why did you choose to normalize `monthlyBudget` to `null` on the
backend rather than leaving it as an empty string?**
A: `NUMERIC` columns in PostgreSQL reject an empty string outright (a type
error), and mixing "empty string" and "null" as two different
representations of "no budget" would force every consumer of the data
(SQL queries, the frontend) to check for both. Normalizing once in
`validateCategory` middleware means the rest of the app only ever sees a
real number or `null`.

---

## 7. QUICK COMMAND REFERENCE

| Step | Command | Where |
|------|---------|-------|
| 1. Clone | `git clone <repo-url> team-expense-tracker && cd team-expense-tracker` | anywhere |
| 2. Create DB | `createdb team_expense_tracker` | terminal (needs local Postgres) |
| 3. Backend env | `cd server && cp .env.example .env` | `server/` |
| 4. Backend install | `npm install` | `server/` |
| 5. Create schema | `npm run db:schema` | `server/` |
| 6. Seed sample data | `npm run db:seed` | `server/` |
| 5+6 combined | `npm run db:setup` | `server/` |
| 7. Run backend (dev) | `npm run dev` | `server/` |
| 8. Frontend env | `cd client && cp .env.example .env` | `client/` |
| 9. Frontend install | `npm install` | `client/` |
| 10. Run frontend (dev) | `npm run dev` | `client/` |
| 11. Build frontend for prod | `npm run build` | `client/` |
| 12. Preview prod build | `npm run preview` | `client/` |
| 13. Run backend (prod) | `npm start` | `server/` |
| 14. Health check | `curl http://localhost:5000/api/health` | anywhere |
| 15. Full stack via Docker | `docker compose up --build` | repo root |
| 16. Stop Docker stack | `docker compose down` | repo root |
| 17. Stop Docker stack + wipe DB volume | `docker compose down -v` | repo root |
