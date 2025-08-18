const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const { engine } = require('express-handlebars');
const app = express();
const port = 3000;
const methodOverride = require('method-override')
const moment = require('moment'); 
const route = require('./routes');
const db = require('./config/db');
const helpers = require('../helpers/helper');

app.use(session({
  secret: 'ban-co-the-thay-bang-key-cua-ban',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
  }
}));


app.use((req, res, next) => {
  console.log('Session admin:', req.session.admin);
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.session.user || null; 
  next();
});


// app.use(session({
//   secret: 'your_secret_key',     // khóa bí mật để mã hóa session cookie
//   resave: false,                 // không lưu lại session nếu không có thay đổi
//   saveUninitialized: false,      // không lưu session chưa được thiết lập
//   cookie: { maxAge: 1000 * 60 * 60 * 24 }  // thời gian tồn tại cookie (vd: 1 ngày)
// }));


// Kết nối database
db.connect();

// Cấu hình thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));


// HTTP logger
app.use(morgan('combined'));


// Sử dụng flash
app.use(flash());

// Truyền messages vào res.locals để dùng trong view
app.use((req, res, next) => {
    res.locals.messages = req.flash('messages');
    next();
});

// ✅ Middleware để xử lý modal đăng nhập
app.use((req, res, next) => {
  res.locals.openLoginModal = req.query.openLoginModal === 'true';
  res.locals.error = req.query.error;
  next();
});

// Cấu hình template engine
app.engine('hbs', engine({
    extname: '.hbs',
    layoutsDir: path.join(__dirname, 'resources', 'views', 'layouts'),
    defaultLayout: 'main',
    partialsDir: path.join(__dirname, 'resources', 'views', 'partials'),
    helpers

}));


app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources', 'views'));

// Khởi tạo routes
route(app);

// Khởi động server
app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});


// Cuối cùng, sau tất cả các route
app.use((req, res) => {
  res.status(404).render('errors/404', {
    layout: 'main',
    isHome: true,
    message: 'Trang bạn tìm không tồn tại.',
  });
});
