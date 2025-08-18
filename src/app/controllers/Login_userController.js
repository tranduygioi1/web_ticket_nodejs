const User = require('../models/User');
const sendMail = require('../../../helpers/send.mail')

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client('41696005756-nb9sb5ksksedhhco8i67jtvub5sj4g33.apps.googleusercontent.com');

class Login_userController {

  // [POST] /user/login
  xulyLogin(req, res) {
    const { email_login, password } = req.body;

    User.findOne({ email_login })
      .then(user => {
        if (!user) {
          return res.status(401).json({ message: 'Email không tồn tại!' });
        }
        if (user.password !== password) {
          return res.status(401).json({ message: 'Sai mật khẩu!' });
        }
        req.session.user = {
          _id: user._id,
          email_login: user.email_login
        };
        res.status(200).json({ message: 'Đăng nhập thành công', user });
      })
      .catch(error => {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server!' });
      });
  }

  // [POST] /user/register
  xulyRegister(req, res) {
    const { email_login, password } = req.body;

    User.findOne({ email_login })
      .then(existingUser => {
        if (existingUser) {
          return res.status(400).json({ message: 'Email đã tồn tại!' });
        }
        const newUser = new User({ email_login, password });
        return newUser.save();
      })
      .then(newUser => {
        if (!newUser) return; // đã trả lỗi phía trên
        res.status(201).json({
          message: 'Đăng ký thành công!',
          user: newUser
        });
      })
      .catch(error => {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server!' });
      });
  }

  // [POST] /user/google-login
  xulyGoogleLogin(req, res) {
    const { idToken } = req.body;

    client.verifyIdToken({
      idToken,
      audience: '41696005756-nb9sb5ksksedhhco8i67jtvub5sj4g33.apps.googleusercontent.com',
    })
      .then(ticket => {
        const payload = ticket.getPayload();
        const email = payload.email;
        const name = payload.name;

        return User.findOne({ email_login: email })
          .then(user => {
            if (user) return user;
            const newUser = new User({
              email_login: email,
              name: name,
              password: ''
            });
            return newUser.save();
          });
      })
      .then(user => {
        req.session.user = {
          _id: user._id,
          email_login: user.email_login,
          name: user.name,
        };
        res.status(200).json({ message: 'Đăng nhập Google thành công', user });
      })
      .catch(err => {
        console.error('Lỗi xác thực Google:', err);
        res.status(401).json({ message: 'Xác thực Google thất bại!' });
      });
  }

  // [POST] /user/forgotpassword
  forgotPasswordModal(req, res) {
    const { email, newPassword, confirmPassword } = req.body;

    function generateVerifyCode() {
      return Math.floor(1000 + Math.random() * 9000).toString();
    }

    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Mật khẩu không khớp.' });
    }

    User.findOne({ email_login: email })
      .then(user => {
        if (!user) {
          return res.status(404).json({ message: 'Email không tồn tại.' });
        }

        const verifyCode = generateVerifyCode();
        req.session.resetPassword = {
          email,
          newPassword,
          verifyCode,
          createdAt: Date.now(),
        };

        return sendMail({
          email,
          subject: 'Mã xác thực khôi phục mật khẩu',
          html: `<p>Mã xác thực của bạn là: <b>${verifyCode}</b></p>`,
        });
      })
      .then(() => {
        if (res.headersSent) return; // đã trả lỗi phía trên
        res.status(200).json({ message: 'Đã gửi mã xác thực tới email.' });
      })
      .catch(err => {
        console.error(err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Có lỗi xảy ra khi xử lý.' });
        }
      });
  }

  // [POST] /user/verify-code
  verifyCode(req, res) {
    const { code } = req.body;
    const sessionData = req.session.resetPassword;

    if (!sessionData || !sessionData.verifyCode || !sessionData.email) {
      return res.status(400).json({ message: 'Không tìm thấy thông tin xác thực.' });
    }

    const timeLimit = 5 * 60 * 1000;
    const isExpired = Date.now() - sessionData.createdAt > timeLimit;
    if (isExpired) {
      req.session.resetPassword = null;
      return res.status(400).json({ message: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu lại.' });
    }

    if (code !== sessionData.verifyCode) {
      return res.status(401).json({ message: 'Mã xác thực không đúng.' });
    }

    User.findOne({ email_login: sessionData.email })
      .then(user => {
        if (!user) {
          return res.status(404).json({ message: 'Tài khoản không tồn tại.' });
        }
        user.password = sessionData.newPassword;
        return user.save();
      })
      .then(() => {
        req.session.resetPassword = null;
        res.status(200).json({ message: 'Cập nhật mật khẩu thành công.' });
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({ message: 'Lỗi khi cập nhật mật khẩu.' });
      });
  }
}

module.exports = new Login_userController();