# CLAUDE.md

## Project overview

Spendly is a lightweight personal expense tracker built with Node.js, Express, and SQLite.

---

## Architecture

```
expense-tracker/
├── server.js              # All routes — single file, no route modules yet
├── db/
│   ├── index.js           # SQLite connection singleton (better-sqlite3, WAL, FK on)
│   └── init.js            # Schema creation: initDb(), seedDb()
├── views/
│   ├── layouts/
│   │   └── base.ejs       # Shared layout — all pages must include this
│   ├── landing.ejs        # Landing page
│   ├── auth/
│   │   ├── login.ejs      # Login form
│   │   └── register.ejs   # Register form
│   └── policy/
│       ├── terms.ejs      # Terms of Service
│       └── privacy.ejs    # Privacy Policy
├── public/
│   ├── css/
│   │   └── style.css      # Global styles
│   └── js/
│       └── main.js        # Vanilla JS only
├── package.json
└── .env                   # Not tracked — needs SESSION_SECRET
```

**Where things belong:**

- New routes → `server.js` only, no route modules yet
- DB logic → `db/` only, never inline in routes
- New pages → new `.ejs` file that includes `layouts/base`
- Page-specific styles → `public/css/style.css`, not inline `<style>` tags

---

## Code style

- JavaScript: 2-space indent, `const`/`let` only (never `var`), semicolons, CommonJS (`require` / `module.exports`) — the project is not ESM
- Templates: EJS with the include-with-body pattern — every page ends with `<%- include('layouts/base', { title, body }) %>`
- Route handlers: one responsibility only — fetch data, render view, done
- DB queries: always use parameterized queries (`?` placeholders) — never string interpolation in SQL
- Error handling: use `res.status(...).render(...)` for HTTP errors, not bare `res.send('error string')`

---

## Tech constraints

- **Express only** — no Fastify, no Koa, no NestJS
- **SQLite via better-sqlite3 only** — no PostgreSQL, no Sequelize/Prisma ORM, no external DB
- **EJS only** — no Pug, no Handlebars, no Nunjucks
- **Vanilla JS only** — no React, no Vue, no jQuery, no npm frontend packages
- **No new npm packages** — work within `package.json` as-is unless explicitly told otherwise
- Node.js 18+ assumed — modern JS syntax is fine

---

## Subagent Policy

- Always use a builtin explore subagent for codebase exploration
  before implementing any new feature
- Always use a subagent to verify test results
  after any implementation
- When asked to plan, delegate codebase research
  to a subagent before presenting the plan
- always use a builtin plan subagent in plan mode

---

## Commands

```bash
# Setup
npm install

# Create tables (run once, safe to re-run)
npm run init-db

# Run dev server with auto-reload (port 3000)
npm run dev

# Run production server
npm start
```

---

## Implemented vs stub routes

| Route                       | Status                                          |
| --------------------------- | ----------------------------------------------- |
| `GET /`                     | Implemented — renders `landing.ejs`             |
| `GET /register`             | Implemented — renders `auth/register.ejs`       |
| `POST /register`            | Not implemented — Step 5                         |
| `GET /login`                | Implemented — renders `auth/login.ejs`          |
| `POST /login`               | Not implemented — Step 6                         |
| `GET /logout`               | Implemented — destroys session, redirects to `/` |
| `GET /terms`                | Implemented — renders `policy/terms.ejs`        |
| `GET /privacy`              | Implemented — renders `policy/privacy.ejs`      |
| `GET /profile`              | Stub — Step 4                                   |
| `GET /expenses/add`         | Stub — Step 7                                   |
| `GET /expenses/:id/edit`    | Stub — Step 8                                   |
| `GET /expenses/:id/delete`  | Stub — Step 9                                   |

**Do not implement a stub route unless the active task explicitly targets that step.**

---

## Warnings and things to avoid

- **Never hardcode URLs** in templates — keep every internal link in sync with the route defined in `server.js`
- **Never put DB logic in route handlers** — it belongs in `db/`
- **Never install new packages** mid-feature without flagging it — keep `package.json` in sync
- **Never use JS frameworks** — the frontend is intentionally vanilla
- **`models/`, `controllers/`, `routes/`, and `middleware/` do not exist yet** — do not assume helpers exist until the step that implements them
- **FK enforcement is set in `db/index.js`** — `PRAGMA foreign_keys = ON` runs once on the singleton connection; set it again if a second connection is ever created
- **Session secret defaults to `'dev-secret-change-me'`** — set `SESSION_SECRET` in `.env` before running anywhere real
- The app runs on **port 3000** unless the `PORT` env var says otherwise — don't hardcode a different port
