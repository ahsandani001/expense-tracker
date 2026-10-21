require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

app.get('/', (req, res) => res.render('landing'));
app.get('/register', (req, res) => res.render('auth/register'));
app.get('/login', (req, res) => res.render('auth/login'));
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });
app.get('/profile', (req, res) => res.send('Profile page — coming in Step 4'));
app.get('/terms', (req, res) => res.render('policy/terms'));
app.get('/expenses/add', (req, res) => res.send('Add expense — coming in Step 7'));
app.get('/expenses/:id/edit', (req, res) => res.send('Edit expense — coming in Step 8'));
app.get('/expenses/:id/delete', (req, res) => res.send('Delete expense — coming in Step 9'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
