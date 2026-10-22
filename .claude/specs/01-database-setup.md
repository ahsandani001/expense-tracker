# Spec Document

## 1. Overview

Replace the stub in `db/init.js` with a working SQLite implementation.

This step establishes the **data layer foundation** for the Spendly application.

All future features (authentication, profile, expense tracking) depend on this being correctly implemented.

---

## 2. Depends on

Nothing — this is the first step.

---

## 3. Routes

- No new routes
- Existing placeholder routes in `server.js` remain unchanged

---

## 4. Database Schema

---

### A. users

| Column        | Type    | Constraints                |
| ------------- | ------- | -------------------------- |
| id            | INTEGER | Primary key, autoincrement |
| name          | TEXT    | Not null                   |
| email         | TEXT    | Unique, not null           |
| password_hash | TEXT    | Not null                   |
| created_at    | TEXT    | Default datetime('now')    |

---

### B. expenses

| Column      | Type    | Constraints                      |
| ----------- | ------- | -------------------------------- |
| id          | INTEGER | Primary key, autoincrement       |
| user_id     | INTEGER | Foreign key → users.id, not null |
| amount      | REAL    | Not null                         |
| category    | TEXT    | Not null                         |
| date        | TEXT    | Not null (YYYY-MM-DD format)     |
| description | TEXT    | Nullable                         |
| created_at  | TEXT    | Default datetime('now')          |

---

## 5. Functions to Implement (`db/index.js` + `db/init.js`)

---

### A. Database connection singleton (`db/index.js`)

- Opens connection to `expense_tracker.db` in project root
- Sets:
  - `foreign_keys = ON`
  - `journal_mode = WAL`
- Exports the connection (better-sqlite3 singleton)
- Returns the connection

---

### B. `initDb()` (`db/init.js`)

- Creates both tables using `CREATE TABLE IF NOT EXISTS`
- Safe to call multiple times
- Ensures schema is ready before app usage

---

### C. `seedDb()` (`db/init.js`)

- Checks if `users` table already contains data
  - If yes → return early (no duplication)
- Inserts one demo user:
  - name: Demo User
  - email: demo@spendly.com
  - password: demo123 (hashed using `bcrypt`)
- Inserts **8 sample expenses**:
  - All linked to demo user
  - Cover multiple categories
  - Dates spread across current month
  - At least one expense per category

---

## 6. Changes to `server.js`

- Import:
  - `initDb`
  - `seedDb`
- Call `initDb()` and `seedDb()` on startup
- Ensure DB is ready before routes are used

---

## 7. Files to Change

- `db/index.js` → implement all functions
- `server.js` → add imports and startup calls

---

## 8. Files to Create

- None

---

## 9. Dependencies

- No new npm packages
- Use:
  - `better-sqlite3` (SQLite — replaces Python `sqlite3`)
  - `bcrypt` (password hashing — replaces Python `werkzeug.security`)

---

## 10. Categories (Fixed List)

Use exactly these values:

- Food
- Transport
- Bills
- Health
- Entertainment
- Shopping
- Other

---

## 11. Rules for Implementation

- No ORMs (no Sequelize, Prisma, etc.)
- Use **parameterized queries only**
- Never use string formatting in SQL
- Enable `PRAGMA foreign_keys = ON` on the connection
- Store `amount` as REAL (float), not INTEGER
- Hash passwords using `bcrypt`
- `seedDb()` must prevent duplicate inserts
- Dates must follow **YYYY-MM-DD format consistently**

---

## 12. Expected Behavior

- `initDb()` returns a working connection with:
  - foreign key enforcement enabled
- `initDb()`:
  - creates tables safely
  - does not fail on repeated runs
- `seedDb()`:
  - inserts demo data only once
  - does not duplicate records on multiple runs
- Database enforces:
  - unique email constraint
  - valid foreign key relationships

---

## 13. Error Handling Expectations

- Inserting duplicate email → should fail (UNIQUE constraint)
- Inserting expense with invalid `user_id` → should fail (foreign key constraint)
- Invalid queries → should raise clear errors for debugging

---

## 14. Definition of Done

- [ ] Database file is created on app startup
- [ ] Both tables exist with correct schema and constraints
- [ ] Demo user exists with hashed password
- [ ] 8 sample expenses exist across categories
- [ ] No duplicate seed data on repeated runs
- [ ] App starts without errors
- [ ] Foreign key enforcement works
- [ ] All queries use parameterized SQL