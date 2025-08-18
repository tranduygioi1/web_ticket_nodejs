const express = require('express');
const router = express.Router();
const login_userController = require('../app/controllers/Login_userController');

// Xử lý form login
router.post('/login', login_userController.xulyLogin);

router.post('/register', login_userController.xulyRegister);

router.post('/google-login', login_userController.xulyGoogleLogin);

router.post('/forgotpassword', login_userController.forgotPasswordModal);

router.post('/verify-code', login_userController.verifyCode);



router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
