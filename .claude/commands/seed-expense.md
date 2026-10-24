---
description: Seed realistic dummy expenses for a specific user
argument-hint: '<user_id> <count> <months>'
allowed-tools: Read, Write, Bash(node:*), Bash(npm:*)
---

Seed realistic expenses for a user, matching the patterns in `db/init.js`.

# Overview

This command generates random expenses across the past `months` months for a specific `user_id`. 

# Steps

### 1. Parse and validate arguments

The script receives command-line arguments via `process.argv`:

```bash
node temp/seed-expense-tmp.js <user_id> <count> <months>
```

Extract `user_id`, `count`, and `months` from arguments:
- `user_id` — integer (must be > 0)
- `count` — integer (number of expenses to generate)  
- `months` — integer (how many past months to spread across)

If any argument is missing or invalid:
```
Usage: /seed-expenses <user_id> <count> <months>
Example: /seed-expenses 1 50 6
```

### 2. Verify user exists

Before generating anything, confirm the `user_id` exists in the `users` table:

```js
const result = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
if (!result) {
  console.error(`No user found with id ${userId}.`);
  process.exit(1);
}
```

### 3. Create temp script

Write `temp/seed-expense-tmp.js` with:

**Script template:**

```js
// temp/seed-expense-tmp.js
const db = require('../db/index.js');

// Parse arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node temp/seed-expense-tmp.js <user_id> <count> <months>');
  process.exit(1);
}

const userId = parseInt(args[0]);
const count = parseInt(args[1]);
const months = parseInt(args[2]);

if (!userId || !count || !months || userId <= 0 || count <= 0 || months <= 0) {
  console.error('Invalid arguments. All values must be positive integers.');
  process.exit(1);
}

// Verify user exists
const userResult = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
if (!userResult) {
  console.error(`No user found with id ${userId}.`);
  process.exit(1);
}

// Start transaction
db.exec('BEGIN TRANSACTION');

try {
  // Generate expenses
  const today = new Date();
  const startDate = new Date();
  startDate.setMonth(today.getMonth() - months);

  // Category definitions with realistic Indian amounts
  const categories = [
    { name: 'Food', min: 50, max: 800, weight: 0.4 },    // Most common
    { name: 'Transport', min: 20, max: 500, weight: 0.2 },
    { name: 'Bills', min: 200, max: 3000, weight: 0.15 },
    { name: 'Health', min: 100, max: 2000, weight: 0.1 },
    { name: 'Entertainment', min: 100, max: 1500, weight: 0.07 },
    { name: 'Shopping', min: 200, max: 5000, weight: 0.05 },
    { name: 'Other', min: 50, max: 1000, weight: 0.03 }   // Least common
  ];

  const insertedExpenses = [];
  const insertStmt = db.prepare(
    'INSERT INTO expenses (user_id, category, amount, date, description) VALUES (?, ?, ?, ?, ?)'
  );

  for (let i = 0; i < count; i++) {
    const randomDays = Math.floor(Math.random() * (months * 30));
    const expenseDate = new Date(startDate);
    expenseDate.setDate(expenseDate.getDate() + randomDays);
    const dateStr = expenseDate.toISOString().split('T')[0];

    const rand = Math.random();
    let category = null;
    let cumulative = 0;
    for (const cat of categories) {
      cumulative += cat.weight;
      if (rand <= cumulative) {
        category = cat;
        break;
      }
    }

    const amount = Math.floor(Math.random() * (category.max - category.min + 1)) + category.min;

    // Generate realistic Indian descriptions
    const descriptions = {
      Food: ['Grocery shopping', 'Meal delivery', 'Restaurant bill', 'Coffee shop', 'Street food', 'Home cooked'],
      Transport: ['Bus pass', 'Taxi ride', 'Fuel', 'Auto rickshaw', 'Metro pass', 'Parking'],
      Bills: ['Electricity bill', 'Water bill', 'Internet bill', 'Phone bill', 'Gas bill', 'Subscription'],
      Health: ['Pharmacy', 'Doctor consultation', 'Medicine', 'Hospital visit', 'Wellness checkup'],
      Entertainment: ['Movie tickets', 'Concert', 'Gaming', 'Streaming subscription', 'Sports event'],
      Shopping: ['Clothing', 'Electronics', 'Shoes', 'Accessories', 'Home goods', 'Beauty'],
      Other: ['Gift', 'Donation', 'Prize', 'Miscellaneous', 'Unexpected expense']
    };

    const description = descriptions[category.name][
      Math.floor(Math.random() * descriptions[category.name].length)
    ];

    const result = insertStmt.run(userId, category.name, amount, dateStr, description);
    insertedExpenses.push({
      id: result.lastInsertRowid,
      user_id: userId,
      category: category.name,
      amount: amount,
      date: dateStr,
      description: description
    });
  }

  // Commit transaction
  db.exec('COMMIT');

  // Print confirmation
  const dates = insertedExpenses.map(e => e.date).sort();
  console.log(`✅ Successfully inserted ${insertedExpenses.length} expenses:`);
  console.log(`  User ID: ${userId}`);
  console.log(`  Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
  console.log(`  Sample records:`);
  insertedExpenses.slice(0, 5).forEach(exp => {
    console.log(`    - [${exp.date}] ${exp.category}: ₹${exp.amount} (${exp.description})`);
  });

} catch (error) {
  db.exec('ROLLBACK');
  console.error('Error inserting expenses:', error.message);
  process.exit(1);
}
```

### 4. Execute the script

Run with command-line arguments:

```bash
node temp/seed-expense-tmp.js <user_id> <count> <months>
```

Example:
```bash
node temp/seed-expense-tmp.js 1 50 6
```

### 5. Clean up

`temp/` is already in `.gitignore` (see line 38). Script remains on disk for future use but is git-ignored.

# Key features

- **User validation** — verifies user exists before creating expenses
- **Proportional category distribution** — Food most common (40%), Health/Entertainment least common
- **Random date spread** — expenses distributed across past N months
- **Indian context** — realistic amounts and descriptions
- **Transaction safety** — all inserts committed or rolled back together
- **Formatted output** — summary with sample records
- **Reusable temp script** — stays in project for multiple runs

