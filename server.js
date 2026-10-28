require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb, seedDb } = require('./db/init');
const authRouter = require('./routes/auth');

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.use((req, res, next) => {
  res.locals.isLoggedIn = Boolean(req.session && req.session.userId);
  next();
});

app.use('/', authRouter);
app.get('/', (req, res) => {
  const loginSuccess = req.query.login === 'success';
  res.render('landing', { loginSuccess });
});
app.get('/profile', (req, res) => res.send('Profile page — coming in Step 4'));
app.get('/terms', (req, res) => res.render('policy/terms'));
app.get('/privacy', (req, res) => res.render('policy/privacy'));
app.get('/expenses/add', (req, res) => res.send('Add expense — coming in Step 7'));
app.get('/expenses/:id/edit', (req, res) => res.send('Edit expense — coming in Step 8'));
app.get('/expenses/:id/delete', (req, res) => res.send('Delete expense — coming in Step 9'));

initDb();
seedDb();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
