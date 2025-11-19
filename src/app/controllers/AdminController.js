const { multipleMongooseToObject, mongooseToObject } = require('../../util/mongoose');
const Event = require('../models/Event');
const BookingTicket  = require('../models/BookingTicket');
const moment = require('moment');
require('moment/locale/vi');
moment.locale('vi');
const sendMail = require('../../../helpers/send.mail');
const helpers = require('../../../helpers/helper');
const defaultAdmins = require('../../config/db/adminAccounts');
const Admin = require('../models/Admin');
const Role = require('../models/Role');

// ====== CẤU HÌNH QUYỀN → ĐƯỜNG DẪN ======
const PATH_BY_PERMISSION = {
  'Create event':        '/admin/create_event',
  'Manage list event':   '/admin/list_event',
  'Manage ticket':       '/admin/booking_management',
  'Manage admin':        '/admin/manage_admin',
  'Manage assign':       '/admin/manage_admin',
  'Manage roles':        '/admin/manage_roles',
};
// Thứ tự ưu tiên khi login để redirect (có thể đổi)
const LANDING_ORDER = [
  'Manage assign',
  'Manage admin',
  'Manage roles',
  'Manage ticket',
  'Manage list event',
  'Create event',
  'test'
];

// ====== HELPER QUYỀN ======
function hasAnyPermission(userRoles = [], required = []) {
  return required.some(r => userRoles.includes(r));
}
function checkPermission(req, res, required = []) {
  if (!req.session.admin || !Array.isArray(req.session.admin.roles)) {
    res.send(`
      <script>
        alert('Bạn chưa đăng nhập hoặc không có quyền.');
        window.history.back();
      </script>
    `);
    return false;
  }
  if (!hasAnyPermission(req.session.admin.roles, required)) {
    res.send(`
      <script>
        alert('Bạn không có quyền truy cập trang này.');
        window.history.back();
      </script>
    `);
    return false;
  }
  return true;
}
function firstLandingPath(roles = []) {
  for (const key of LANDING_ORDER) {
    if (roles.includes(key)) return PATH_BY_PERMISSION[key] || '/';
  }
  return '/';
}

// Bỏ dấu để search tên
function removeDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

class AdminController {
  // GET /admin
  admin(req, res) {
    res.render('admin/login', { layout: false });
  }

  // POST /admin/login
  xulylogin(req, res) {
    const { username, password } = req.body;

    // 1) Check default admin
    const superAdmin = defaultAdmins.find(
      acc => acc.username === username && acc.password === password
    );
    if (superAdmin) {
      // Default admin có full quyền
      const fullRoles = [
        'Create event',
        'Manage list event',
        'Manage ticket',
        'Manage admin',
        'Manage roles',
        'Manage assign',
      ];
      req.session.admin = {
        username: superAdmin.username,
        name: superAdmin.name || 'Super Admin',
        roles: fullRoles,
      };
      return res.redirect(firstLandingPath(fullRoles));
    }

    // 2) Check DB admin
    Admin.findOne({ username })
      .then(admin => {
        if (!admin) return res.status(400).send('Tài khoản không tồn tại');
        if (admin.password.trim() !== password.trim()) {
          return res.status(400).send('Sai mật khẩu');
        }

        const roles = Array.isArray(admin.roles) ? admin.roles : [];
        req.session.admin = {
          _id: admin._id,
          username: admin.username,
          name: admin.name,
          roles,
        };
        return res.redirect(firstLandingPath(roles));
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Lỗi server');
      });
  }

  // ============ QUẢN LÝ ADMIN ============

  // GET /admin/manage_admin (xem danh sách)
  manageAdmin(req, res) {
    if (!checkPermission(req, res, ['Manage admin', 'Manage assign'])) return;

    const keywordRaw = req.query.q ? req.query.q.trim() : '';
    const keyword = removeDiacritics(keywordRaw.toLowerCase());

    Admin.find()
      .then(adminList => {
        let filtered = adminList;
        if (keyword) {
          filtered = adminList.filter(a => {
            const n = removeDiacritics((a.name || '').toLowerCase());
            const u = removeDiacritics((a.username || '').toLowerCase());
            return n.includes(keyword) || u.includes(keyword);
          });
        }

        const canAssign = req.session.admin.roles.includes('Manage assign'); // bật/tắt nút gán quyền

        res.render('admin/manage_admin', {
          layout: 'admin',
          admin: multipleMongooseToObject(filtered),
          canAssign,
          keyword: '',
        });
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Lỗi server');
      });
  }

  // POST /admin/add_admin
  addAdmin(req, res) {
    if (!checkPermission(req, res, ['Manage admin', 'Manage assign'])) return;

    const { username, name, password } = req.body;
    Admin.create({ username, name, password, roles: [] })
      .then(() => res.redirect('/admin/manage_admin'))
      .catch(err => {
        console.error(err);
        res.status(500).send('Lỗi server');
      });
  }

  // POST /admin/delete_admin/:id
  deleteAdmin(req, res) {
    if (!checkPermission(req, res, ['Manage admin', 'Manage assign'])) return;

    Admin.findByIdAndDelete(req.params.id)
      .then(() => res.redirect('/admin/manage_admin'))
      .catch(err => {
        console.error(err);
        res.status(500).send('Lỗi server');
      });
  }

  // GET /admin/assign_roles/:id (chỉ ai có Manage assign)
  assign_roles(req, res) {
    if (!checkPermission(req, res, ['Manage assign'])) return;

    Admin.findById(req.params.id)
      .then(admin => {
        if (!admin) return res.status(404).send('Admin không tồn tại');

        return Role.find({}).then(roles => {
          const allRoles = roles.map(r => r.role_name);
          res.render('admin/assign_roles', {
            layout: 'admin',
            user: {
              _id: admin._id,
              username: admin.username,
              fullName: admin.name,
            },
            allRoles,
            assignedRoles: admin.roles || [],
          });
        });
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Lỗi khi lấy thông tin gán quyền');
      });
  }

  // POST /admin/assign_roles/:id
  async save_assign_roles(req, res) {
    if (!checkPermission(req, res, ['Manage assign'])) return;

    const assigned = req.body.assignedRoles;
    const rolesArray = Array.isArray(assigned) ? assigned : (assigned ? [assigned] : []);

    try {
      await Admin.findByIdAndUpdate(req.params.id, { roles: rolesArray }, { new: true });
      res.redirect('/admin/manage_admin');
    } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi khi lưu quyền');
    }
  }

  // ============ QUYỀN LIÊN QUAN SỰ KIỆN ============

  // GET /admin/create_event (Create event)
  create(req, res) {
    if (!checkPermission(req, res, ['Create event'])) return;
    res.render('admin/create_event', { layout: 'admin' });
  }

  // POST /admin/addevent (Create event)
  addevent(req, res) {
    if (!checkPermission(req, res, ['Create event'])) return;

    const { name, description, image, location, prices, eventDate, startTime, endTime, category } = req.body;

    if (!category) {
      req.flash('messages', { type: 'danger', message: 'Vui lòng chọn danh mục sự kiện.' });
      return res.redirect('/admin/create_event');
    }

    const timeFormatted = `${startTime} - ${endTime}, ${moment(eventDate).format('DD [Tháng] MM, YYYY')}`;
    const event = new Event({ name, description, image, location, prices, category, time: timeFormatted });

    event.save()
      .then(() => {
        req.flash('messages', { type: 'success', message: 'Thêm sự kiện thành công!' });
        res.redirect('/admin/create_event');
      })
      .catch(err => {
        console.error(err);
        req.flash('messages', { type: 'danger', message: 'Lỗi khi thêm sự kiện. Vui lòng thử lại!' });
        res.redirect('/admin/create_event');
      });
  }

  // GET /admin/:id/update_event (Manage list event)
  update(req, res, next) {
    if (!checkPermission(req, res, ['Manage list event'])) return;

    Event.findById(req.params.id)
      .then(event => {
        event = mongooseToObject(event);
        if (event?.time) {
          const parts = event.time.split(',');
          const times = parts[0].trim().split('-').map(t => t.trim());
          event.startTime = times[0] || '';
          event.endTime = times[1] || '';

          const datePart = parts[1] ? parts[1].trim() : '';
          const yearPart = parts[2] ? parts[2].trim() : '';
          if (datePart && yearPart) {
            const dateMatch = datePart.match(/(\d{2})\s*Tháng\s*(\d{2})/);
            if (dateMatch) {
              const day = dateMatch[1];
              const month = dateMatch[2];
              event.eventDate = `${yearPart}-${month}-${day}`;
            }
          }
        }

        res.render('admin/update_event', { event, layout: 'admin' });
      })
      .catch(next);
  }

  // PUT /admin/:id (Manage list event)
  edit(req, res) {
    if (!checkPermission(req, res, ['Manage list event'])) return;

    const { startTime, endTime, eventDate } = req.body;
    if (startTime && endTime && eventDate) {
      const date = new Date(eventDate);
      const ngay = date.getDate().toString().padStart(2, '0');
      const thang = (date.getMonth() + 1).toString().padStart(2, '0');
      const nam = date.getFullYear();
      req.body.time = `${startTime} - ${endTime}, ${ngay} Tháng ${thang}, ${nam}`;
    }
    delete req.body.eventDate;
    delete req.body.startTime;
    delete req.body.endTime;

    Event.updateOne({ _id: req.params.id }, req.body)
      .then(() => {
        req.flash('messages', { type: 'success', message: 'Cập nhật sự kiện thành công!' });
        res.redirect('/admin/list_event');
      })
      .catch(err => {
        console.error(err);
        req.flash('messages', { type: 'danger', message: 'Lỗi khi Update sự kiện. Vui lòng thử lại!' });
        res.redirect('/admin/list_event');
      });
  }

  // GET /admin/list_event (Manage list event)
  listOrSearch(req, res, next) {
    if (!checkPermission(req, res, ['Manage list event'])) return;

    const keyword = req.query.q;
    const selectedCategory = req.query.category;
    const condition = {};
    if (keyword) condition.name = { $regex: keyword, $options: 'i' };
    if (selectedCategory) condition.category = selectedCategory;

    Event.find(condition)
      .then(events => {
        res.render('admin/list_event', {
          layout: 'admin',
          selectedCategory,
          allEvent: multipleMongooseToObject(events),
        });
      })
      .catch(next);
  }

  // DELETE /admin/:id (Manage list event)
  delete(req, res) {
    if (!checkPermission(req, res, ['Manage list event'])) return;
    Event.deleteOne({ _id: req.params.id })
      .then(() => {
        req.flash('messages', { type: 'success', message: 'Xóa sự kiện thành công!' });
        res.redirect('back');
      })
      .catch(err => {
        console.error(err);
        req.flash('messages', { type: 'danger', message: 'Lỗi khi xóa sự kiện. Vui lòng thử lại!' });
        res.redirect('back');
      });
  }

  // ============ QUẢN LÝ VÉ (Manage ticket) ============

  booking_management(req, res, next) {
    if (!checkPermission(req, res, ['Manage ticket'])) return;
    BookingTicket.find({}).sort({ createdAt: -1 })
      .then(bookings => {
        res.render('admin/booking_management', {
          layout: 'admin',
          allBooking: multipleMongooseToObject(bookings),
          titlePage: 'Quản lý tất cả vé',
        });
      })
      .catch(next);
  }

  bookingSuccess(req, res, next) {
    if (!checkPermission(req, res, ['Manage ticket'])) return;
    BookingTicket.find({ cancelRequest: false, isCanceled: false })
      .sort({ createdAt: -1 })
      .then(bookings => {
        res.render('admin/booking_management', {
          layout: 'admin',
          allBooking: multipleMongooseToObject(bookings),
          titlePage: 'Vé đặt thành công',
        });
      })
      .catch(next);
  }

  bookingPending(req, res, next) {
    if (!checkPermission(req, res, ['Manage ticket'])) return;
    BookingTicket.find({ cancelRequest: true, isCanceled: false })
      .sort({ createdAt: -1 })
      .then(bookings => {
        res.render('admin/booking_management', {
          layout: 'admin',
          allBooking: multipleMongooseToObject(bookings),
          isPending: true,
          titlePage: 'Vé đang chờ hủy',
        });
      })
      .catch(next);
  }

  bookingCanceled(req, res, next) {
    if (!checkPermission(req, res, ['Manage ticket'])) return;
    BookingTicket.find({ isCanceled: true })
      .sort({ createdAt: -1 })
      .then(bookings => {
        res.render('admin/booking_management', {
          layout: 'admin',
          allBooking: multipleMongooseToObject(bookings),
          isCanceled: true,
          titlePage: 'Vé đã hủy',
        });
      })
      .catch(next);
  }

  confirmCancel(req, res, next) {
    if (!checkPermission(req, res, ['Manage ticket'])) return;

    const ticketId = req.params.id;
    BookingTicket.findByIdAndUpdate(
      ticketId,
      { isCanceled: true, cancelRequest: false },
      { new: true }
    )
      .then(async booking => {
        await sendMail({
          email: booking.email,
          subject: 'Xác nhận hủy vé thành công',
          html: `
            <h3>Chào ${booking.fullName},</h3>
            <p>Yêu cầu hủy vé của bạn đã được <strong>duyệt thành công</strong>.</p>
            <p>Sự kiện <strong>${booking.eventName}</strong>.</p>
            <p><strong>Mã đặt vé:</strong> #${booking.bookingCode}</p>
            <p><strong>Số điện thoại:</strong> ${booking.phone}</p>
            <p>Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.</p>
          `,
        });
        res.redirect('/admin/booking_management');
      })
      .catch(next);
  }

  // ============ QUẢN LÝ QUYỀN (Manage Roles) ============

  // GET /admin/manage_roles
  manage_roles(req, res) {
    if (!checkPermission(req, res, ['Manage roles'])) return;

    Role.find({})
      .then(roles => {
        res.render('admin/manage_roles', {
          layout: 'admin',
          roles: multipleMongooseToObject(roles),
        });
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Lỗi load quyền');
      });
  }

  // POST /admin/addRole
  addRole(req, res) {
    if (!checkPermission(req, res, ['Manage roles'])) return;

    const { role_name, description } = req.body;
    Role.findOne({ role_name })
      .then(exist => {
        if (exist) return res.status(400).send('Quyền này đã tồn tại!');
        const role = new Role({ role_name, description });
        return role.save();
      })
      .then(() => res.redirect('/admin/manage_roles'))
      .catch(err => {
        console.error(err);
        res.status(500).send('Lỗi thêm quyền');
      });
  }

  // POST /admin/deleteRole/:id
  deleteRole(req, res, next) {
    if (!checkPermission(req, res, ['Manage roles'])) return;

    Role.deleteOne({ _id: req.params.id })
      .then(() => res.redirect('/admin/manage_roles'))
      .catch(next);
  }

  // POST /admin/editRole/:id
  editRole(req, res) {
    if (!checkPermission(req, res, ['Manage roles'])) return;

    const roleId = req.params.id;
    const { role_name, description } = req.body;
    Role.updateOne({ _id: roleId }, { role_name, description })
      .then(() => res.redirect('/admin/manage_roles'))
      .catch(err => {
        console.error(err);
        res.status(500).send('Lỗi khi cập nhật quyền');
      });
  }
}

module.exports = new AdminController();
