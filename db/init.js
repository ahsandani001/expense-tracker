const db = require('./index');
const bcrypt = require('bcrypt');

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      date DATE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
  `);
  console.log('✅ Database tables created');
}

function seedDb() {
  const existing = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (existing.count > 0) return;

  const passwordHash = bcrypt.hashSync('demo123', 10);

  const userResult = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run('Demo User', 'demo@spendly.com', passwordHash);

  const userId = userResult.lastInsertRowid;

  const expenses = [
    { category: 'Food', amount: 45.50, date: '2026-10-05', description: 'Groceries' },
    { category: 'Transport', amount: 25.00, date: '2026-10-08', description: 'Bus pass' },
    { category: 'Bills', amount: 120.00, date: '2026-10-10', description: 'Electricity' },
    { category: 'Health', amount: 35.00, date: '2026-10-12', description: 'Pharmacy' },
    { category: 'Entertainment', amount: 18.00, date: '2026-10-15', description: 'Movie tickets' },
    { category: 'Shopping', amount: 89.99, date: '2026-10-18', description: 'New shoes' },
    { category: 'Other', amount: 15.00, date: '2026-10-20', description: 'Miscellaneous' },
    { category: 'Food', amount: 32.50, date: '2026-10-22', description: 'Dinner out' },
  ];

  const insertExpense = db.prepare(
    'INSERT INTO expenses (user_id, category, amount, date, description) VALUES (?, ?, ?, ?, ?)'
  );

  for (const expense of expenses) {
    insertExpense.run(userId, expense.category, expense.amount, expense.date, expense.description);
  }

  console.log('✅ Demo data seeded');
}

if (require.main === module) {
  initDb();
  seedDb();
}

module.exports = { initDb, seedDb };