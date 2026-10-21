const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '..', 'expense_tracker.db'));
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
module.exports = db;
