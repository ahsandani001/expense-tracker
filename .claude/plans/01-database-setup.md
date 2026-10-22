# Implementation Plan: Database Setup (Step 01)

## Context

The Spendly expense tracker is a Node.js/Express/SQLite application. The spec at `.claude/specs/01-database-setup.md` defines the data layer foundation. Most of it is already implemented — what remains is wiring up the seed function and connecting the server to the database on startup.

## Current State

| File | Status |
|------|--------|
| `db/index.js` | ✅ Singleton connection to `expense_tracker.db`, FK + WAL enabled |
| `db/init.js` | ⚠️ `initDb()` complete (schema matches spec); `seedDb()` is a stub |
| `server.js` | ⚠️ No DB imports at all — server starts without touching the database |

## What Needs to Change

### 1. `db/init.js` — Implement `seedDb()`

The schema in `initDb()` already matches the spec exactly. Only `seedDb()` needs implementation:

- **Guard against duplicates**: Query `SELECT COUNT(*) FROM users`; if count > 0, return early.
- **Insert demo user**: `name='Demo User'`, `email='demo@spendly.com'`, `password_hash=bcrypt.hashSync('demo123', 10)`. Capture `lastInsertRowid` as the user id.
- **Insert 8 sample expenses**: All linked to the demo user via `user_id`. Use the 7 fixed categories from the spec (Food, Transport, Bills, Health, Entertainment, Shopping, Other) plus one extra for a second entry. Dates spread across the current month in `YYYY-MM-DD` format.
- **Use parameterized queries** (`?` placeholders) — already the pattern in `initDb()`.
- **Require `bcrypt`** at the top of the file (already in `package.json`).

### 2. `server.js` — Wire up DB on startup

- Add `const { initDb, seedDb } = require('./db/init');` after the existing requires.
- Call `initDb()` and `seedDb()` before `app.listen()` so the database is ready before routes are used.

## Files Modified

- `db/init.js` — implement `seedDb()`, add `bcrypt` require
- `server.js` — import and call `initDb()` + `seedDb()` on startup

## Files Unchanged

- `db/index.js` — already correct
- `package.json` — `bcrypt` and `better-sqlite3` already installed
- All route handlers — spec says no new routes

## Verification

1. `npm run init-db` — creates `expense_tracker.db`, prints "✅ Database tables created" and "✅ Demo data seeded"
2. `npm run init-db` again — no duplicate data (seed returns early)
3. `sqlite3 expense_tracker.db "SELECT COUNT(*) FROM users;"` → 1
4. `sqlite3 expense_tracker.db "SELECT COUNT(*) FROM expenses;"` → 8
5. `sqlite3 expense_tracker.db "SELECT DISTINCT category FROM expenses;"` → all 7 categories
6. `npm run dev` — server starts without errors
7. FK enforcement test: insert expense with invalid `user_id` → should fail with a foreign key error
8. UNIQUE test: insert user with `demo@spendly.com` again → should fail with a unique constraint error