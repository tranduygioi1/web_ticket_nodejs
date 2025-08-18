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


// Hàm kiểm tra quyền
function checkRole(req, res, allowedRoles) {
    if (!req.session.admin || !allowedRoles.includes(req.session.admin.role)) {
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


class AdminController {
    // GET /admin
    admin(req, res) {
        res.render('admin/login', { layout: false });
    }

    // POST /admin/login
    // async xulylogin(req, res) {
    //     const { email, password } = req.body;

    //     // Kiểm tra 3 tài khoản gốc (defaultAdmins)
    //     const superAdmin = defaultAdmins.find(
    //         acc => acc.email === email && acc.password === password
    //     );
    //     if (superAdmin) {
    //         req.session.admin = superAdmin;
    //         return res.redirect('/admin/list_event');
    //     }

    //     try {
    //         const admin = await Admin.findOne({ username });

    //         if (!admin) {
    //             return res.status(400).send('Email không tồn tại');
    //         }

    //         if (admin.password.trim() !== password.trim()) {
    //             return res.status(400).send('Sai mật khẩu');
    //         }

    //         // Lưu thông tin admin vào session
    //         req.session.admin = {
    //             _id: admin._id,
    //             email: admin.email,
    //             role: admin.role
    //         };

    //         // Điều hướng theo role
    //         if (admin.role === 'ticket_admin') {
    //             return res.redirect('/admin/booking_management');
    //         } else {
    //             return res.redirect('/admin/list_event');
    //         }

    //     } catch (error) {
    //         console.error(error);
    //         res.status(500).send('Lỗi server');
    //     }
    // }

    xulylogin(req, res) {
    const { username, password } = req.body;

    // Kiểm tra 3 tài khoản gốc (defaultAdmins)
    const superAdmin = defaultAdmins.find(
        acc => acc.username === username && acc.password === password
    );
    if (superAdmin) {
        req.session.admin = superAdmin;
        return res.redirect('/admin/list_event');
    }

    Admin.findOne({ username })
        .then(admin => {
            if (!admin) {
                return res.status(400).send('Tài khoản không tồn tại');
            }

            if (admin.password.trim() !== password.trim()) {
                return res.status(400).send('Sai mật khẩu');
            }

            // Lưu thông tin admin vào session
            req.session.admin = {
                _id: admin._id,
                username: admin.username,
                role: admin.role
            };

            // Điều hướng theo role
            if (admin.role === 'ticket_admin') {
                return res.redirect('/admin/booking_management');
            } else {
                return res.redirect('/admin/list_event');
            }
        })
        .catch(error => {
            console.error(error);
            res.status(500).send('Lỗi server');
        });
    }

    // GET /admin/manage_admin
    manageAdmin(req, res) {
        if (!checkRole(req, res, ['super_admin'])) return;
        Admin.find()
            .then(adminList => {
                res.render('admin/manage_admin', { 
                    admin: multipleMongooseToObject(adminList), 
                    layout: 'admin' 
                });
            })
            .catch(error => {
                console.error(error);
                res.status(500).send('Lỗi server');
            });
    }

    // POST /admin/add_admin
    addAdmin(req, res) {
        if (!checkRole(req, res, ['super_admin'])) return;
        const { username, name, password, role } = req.body;
        Admin.create({ username,name, password, role })
            .then(() => res.redirect('/admin/manage_admin'))
            .catch(error => {
                console.error(error);
                res.status(500).send('Lỗi server');
            });
    }

    // POST /admin/delete_admin/:id
    deleteAdmin(req, res) {
        if (!checkRole(req, res, ['super_admin'])) return;
        Admin.findByIdAndDelete(req.params.id)
            .then(() => res.redirect('/admin/manage_admin'))
            .catch(error => {
                console.error(error);
                res.status(500).send('Lỗi server');
            });
    }

   // [GET] /admin/manage_roles
    manage_roles(req, res, next) {
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


    // [POST] /admin/addRole
    addRole(req, res) {
        const { role_name, description } = req.body;

        Role.findOne({ role_name })
        .then(exist => {
            if (exist) {
            return res.status(400).send('Quyền này đã tồn tại!');
            }

            const role = new Role({ role_name, description });
            return role.save();
        })
        .then(() => {
            res.redirect('/admin/manage_roles');
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Lỗi thêm quyền');
        });
    }

    deleteRole(req, res, next) {
        const roleId = req.params.id;

        Role.deleteOne({ _id: roleId })
        .then(() => {
            res.redirect('/admin/manage_roles'); // quay về trang quản lý role
        })
        .catch(next);
    }

    editRole(req, res) {
    const roleId = req.params.id;
    const { role_name, description } = req.body;

    Role.updateOne({ _id: roleId }, { role_name, description })
        .then(() => res.redirect('/admin/manage_roles'))
        .catch(err => {
        console.error(err);
        res.status(500).send("Lỗi khi cập nhật quyền");
        });
    }



    // [GET] /admin/create_event
    create(req, res, next) {
        if (!checkRole(req, res, ['super_admin', 'event_admin'])) return;
        res.render('admin/create_event', { layout: 'admin' });
    }

    // [POST] /admin/addevent
    addevent(req, res) {
        if (!checkRole(req, res, ['super_admin', 'event_admin'])) return;
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

    // [GET] /admin/:id/update_event
    update(req, res, next) {
        if (!checkRole(req, res, ['super_admin', 'event_admin'])) return;
        Event.findById(req.params.id)
            .then(event => {
                event = mongooseToObject(event);
                if (event.time) {
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

    // [PUT] /admin/:id
    edit(req, res) {
        if (!checkRole(req, res, ['super_admin', 'event_admin'])) return;
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

    listOrSearch(req, res, next) {
        if (!checkRole(req, res, ['super_admin', 'event_admin'])) return;
        const keyword = req.query.q;
        const selectedCategory = req.query.category;
        let condition = {};
        if (keyword) condition.name = { $regex: keyword, $options: 'i' };
        if (selectedCategory) condition.category = selectedCategory;

        Event.find(condition)
            .then(events => {
                res.render('admin/list_event', {
                    layout: 'admin',
                    selectedCategory,
                    allEvent: multipleMongooseToObject(events)
                });
            })
            .catch(next);
    }

    delete(req, res) {
        if (!checkRole(req, res, ['super_admin', 'event_admin'])) return;
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

    booking_management(req, res, next) {
        if (!checkRole(req, res, ['super_admin', 'ticket_admin'])) return;
        BookingTicket.find({})
        .sort({ createdAt: -1 })
            .then(bookings => {
                res.render('admin/booking_management', {
                    layout: 'admin',
                    allBooking: multipleMongooseToObject(bookings),
                    titlePage: "Quản lý tất cả vé",
                });
            })
            .catch(next);
    }

    bookingSuccess(req, res, next) {
        if (!checkRole(req, res, ['super_admin', 'ticket_admin'])) return;
        BookingTicket.find({ cancelRequest: false, isCanceled: false })
        .sort({ createdAt: -1 })
            .then(bookings => {
                res.render('admin/booking_management', {
                    layout: 'admin',
                    allBooking: multipleMongooseToObject(bookings),     
                    titlePage: "Vé đặt thành công",               
                });
            })
            .catch(next);
    }

    bookingPending(req, res, next) {
        if (!checkRole(req, res, ['super_admin', 'ticket_admin'])) return;
        BookingTicket.find({ cancelRequest: true, isCanceled: false })
        .sort({ createdAt: -1 })
            .then(bookings => {
                res.render('admin/booking_management', {
                    layout: 'admin',
                    allBooking: multipleMongooseToObject(bookings),
                    isPending: true,
                    titlePage: "Vé đang chờ hủy",               
                });
            })
            .catch(next);
    }

    bookingCanceled(req, res, next) {
        if (!checkRole(req, res, ['super_admin', 'ticket_admin'])) return;
        BookingTicket.find({ isCanceled: true })
        .sort({ createdAt: -1 })
            .then(bookings => {
                res.render('admin/booking_management', {
                    layout: 'admin',
                    allBooking: multipleMongooseToObject(bookings),
                    isCanceled: true,
                    titlePage: "Vé đã hủy",               
                });
            })
            .catch(next);
    }

    confirmCancel(req, res, next) {
        if (!checkRole(req, res, ['super_admin', 'ticket_admin'])) return;
        const ticketId = req.params.id;
        BookingTicket.findByIdAndUpdate(ticketId, {
            isCanceled: true,
            cancelRequest: false,
        }, { new: true })
        .sort({ createdAt: -1 })
        .then(async (booking) => {
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
                `
            });
            res.redirect('/admin/booking_management');
        })
        .catch(next);
    }
}

module.exports = new AdminController();
