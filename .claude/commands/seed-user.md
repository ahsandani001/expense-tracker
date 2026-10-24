---
description: Create a single dummy user directly in the local SQLite database
allowed-tools: Read, Write, Bash(node:*), Bash(npm:*)
---

Create a realistic dummy user in the `users` table using the existing patterns in `db/init.js`.

1. **Ensure tables exist** — run `npm run init-db` if needed
2. **Create temp script** — write to `temp/seed-user-tmp.js`:
   - Use `./db/index.js` singleton
   - Use `bcrypt.hashSync('demo123', 10)` (matches existing seed)
   - Generate name + email with random 2-3 digit suffix
   - Check uniqueness with `SELECT COUNT(*)` loop (max 5 tries)
   - Insert with parameterized prepared statement
3. **Run it** — `node temp/seed-user-tmp.js`
4. **Clean up** — add `temp/` to `.gitignore`
