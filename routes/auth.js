const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

function redirectIfLoggedIn(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
}

router.get('/register', redirectIfLoggedIn, authController.getRegister);
router.get('/login', redirectIfLoggedIn, authController.getLogin);
router.post('/register', redirectIfLoggedIn, authController.postRegister);
router.post('/login', redirectIfLoggedIn, authController.postLogin);
router.get('/logout', authController.getLogout);

module.exports = router;
