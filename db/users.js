const db = require('./index');

const createUser = ({ name, email, passwordHash }) => {
  const stmt = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  );
  const info = stmt.run(name, email, passwordHash);
  return info.lastInsertRowid;
};

const findUserByEmail = (email) => {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
};

module.exports = { createUser, findUserByEmail };
