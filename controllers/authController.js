const bcrypt = require('bcrypt');
const { createUser, findUserByEmail } = require('../db/users');

const BCRYPT_COST = 12;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

const getRegister = (req, res) => {
  res.render('auth/register', { errors: [], name: '', email: '' });
};

const getLogin = (req, res) => {
  const registered = req.query.registered === '1';
  res.render('auth/login', { registered, email: '' });
};

const postRegister = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirm_password || '');

  const errors = [];

  if (name.length === 0 || name.length > NAME_MAX) {
    errors.push('Name is required and must be 1–100 characters.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email.length === 0 || email.length > EMAIL_MAX || !emailRegex.test(email)) {
    errors.push('A valid email address is required (max 254 characters).');
  }

  if (Buffer.byteLength(password, 'utf8') < PASSWORD_MIN || Buffer.byteLength(password, 'utf8') > PASSWORD_MAX) {
    errors.push('Password must be 8–72 bytes.');
  }

  if (confirmPassword !== password) {
    errors.push('Passwords do not match.');
  }

  if (errors.length > 0) {
    return res.status(400).render('auth/register', { errors, name, email });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

  try {
    await createUser({ name, email, passwordHash });
    return res.redirect('/login?registered=1');
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).render('auth/register', {
        errors: ['Email already registered.'],
        name,
        email
      });
    }
    return res.status(500).render('auth/register', {
      errors: ['Something went wrong. Please try again.'],
      name,
      email
    });
  }
};

const postLogin = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const errors = [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email.length === 0 || email.length > EMAIL_MAX || !emailRegex.test(email)) {
    errors.push('A valid email address is required (max 254 characters).');
  }

  if (Buffer.byteLength(password, 'utf8') === 0) {
    errors.push('Password is required.');
  }

  if (errors.length > 0) {
    return res.status(400).render('auth/login', { errors, email, registered: false });
  }

  try {
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).render('auth/login', {
        errors: ['Invalid email or password.'],
        email,
        registered: false
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).render('auth/login', {
        errors: ['Invalid email or password.'],
        email,
        registered: false
      });
    }

    req.session.userId = user.id;
    return res.redirect('/?login=success');
  } catch (err) {
    return res.status(500).render('auth/login', {
      errors: ['Something went wrong. Please try again.'],
      email,
      registered: false
    });
  }
};

const getLogout = (req, res) => {
  req.session.destroy();
  res.redirect('/');
};

module.exports = { getRegister, getLogin, postRegister, postLogin, getLogout };
