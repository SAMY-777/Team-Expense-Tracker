# Team Expense Tracker

A small full-stack app for a team to log shared expenses, organize them by
category, and see a spending summary — built on the **PERN** stack
(PostgreSQL, Express, React, Node.js).

- **Backend:** Node.js + Express + PostgreSQL (`server/`)
- **Frontend:** React + Vite (`client/`)
- **No authentication** — single hardcoded team, per the assignment brief.

For the full walkthrough (folder structure, step-by-step run instructions,
how the project was built, key concepts, interview Q&A, and a command
cheat-sheet), see **[PROJECT_GUIDE.md](./PROJECT_GUIDE.md)**.

For the assignment's reflection questions, see **[NOTES.md](./NOTES.md)**.

## Fastest way to run it (Docker)

```bash
docker compose up --build
```

Then open:
- Frontend: http://localhost:5173
- Backend health check: http://localhost:5000/api/health

## Running it manually (without Docker)

**Prerequisites:** Node.js 18+, PostgreSQL 14+ running locally.

```bash
# 1. Create the database (adjust user/password to match your local Postgres)
createdb team_expense_tracker

# 2. Backend
cd server
cp .env.example .env        # edit if your DB credentials differ
npm install
npm run db:setup            # creates tables + seeds sample data
npm run dev                 # http://localhost:5000

# 3. Frontend (in a second terminal)
cd client
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173 in your browser. See PROJECT_GUIDE.md § 3 for a
full click-by-click walkthrough of every feature.
