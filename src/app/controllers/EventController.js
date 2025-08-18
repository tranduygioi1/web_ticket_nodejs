const Event = require('../models/Event')
const { multipleMongooseToObject } = require('../../util/mongoose')
const moment = require('moment');
const BookingTicket = require('../models/BookingTicket');
const sendMail = require('../../../helpers/send.mail');


class EventController {
    //[GET] /events/:slug
    show(req, res, next) {
        Promise.all([
            Event.findOne({ slug: req.params.slug }),
            Event.find({})
        ])
        .then(([event, allEvent]) => {
            if (!event) {
                // Không tìm thấy sự kiện → trả về 404
                return res.status(404).render('errors/404', 
                    {
                        layout: 'main',
                        isHome: true,
                        message: 'Sự kiện không tồn tại' });
            }

            res.render('events/show', {
                event: event.toObject(),
                allEvent: multipleMongooseToObject(allEvent),

            });
        })
        .catch(next);
    }

    search(req, res, next) {
        const keyword = req.query.q;
        let condition = {};

        if (keyword) {
            condition = {
                name: { $regex: keyword, $options: 'i' } // tìm không phân biệt hoa thường
            };
        }

        Event.find(condition)
            .then(events => {
                res.render('events/search', {
                    layout: 'main',         // dùng layout chính
                    isHome: true,           // để giữ style giống trang chủ
                    keyword,                // gửi lại từ khóa để hiển thị trong input
                    allEvent: multipleMongooseToObject(events)
                });
            })
            .catch(next);
    }

    myticket(req, res, next) {
        const emailLogin = req.session.user?.email_login?.trim();

        BookingTicket.find({ email: emailLogin })
            .sort({ createdAt: -1 })
            .lean()
            .then(tickets => {
                const all = tickets;
                const success = tickets.filter(t => !t.isCanceled && !t.cancelRequest);
                const pending = tickets.filter(t => !t.isCanceled && t.cancelRequest);
                const canceled = tickets.filter(t => t.isCanceled);

                return Event.aggregate([{ $sample: { size: 8 } }])
                    .then(events => {
                        res.render('events/my_ticket', {
                            layout: 'main',
                            isHome: true,
                            allEvent: multipleMongooseToObject(events),
                            allticket: all,
                            booked: success,
                            pending: pending,
                            canceled: canceled,
                        });
                    });
            })
            .catch(next);
    }


    select_ticket(req, res, next) {
        Event.findOne({ slug: req.params.slug })
            .then(event => {
                if (!event) {
                    return res.status(404).render('errors/404', { message: 'Không tìm thấy sự kiện' });
                }

                res.render('events/select_ticket', {
                    layout: 'main',
                    isHome: true,
                    hideFooter: true,
                    event: event.toObject()
                });
            })
            .catch(next);
    }

    confirm_booking(req, res, next) {
        Event.findOne({ slug: req.params.slug })
            .then(event => {
                if (!event) {
                    return res.status(404).render('errors/404', { message: 'Không tìm thấy sự kiện' });
                }
                const user = req.session.user;
                console.log('User session:', req.session.user);

                // Chỉ truyền event, không cần truyền selectedTickets vì lấy ở client
                res.render('events/confirm_booking', {
                    layout: 'main',
                    isHome: true,
                    hideFooter: true,
                    event: event.toObject(),
                    email_login: user ? user.email_login : ''
                    
                });
            })
            .catch(next);
    }

    

    async saveBooking(req, res, next) {
        try {
            const { hoVaTen, soDienThoai, tickets, totalAmount } = req.body;

            const sessionEmail = req.session.user?.email_login?.trim();
            const email = sessionEmail || req.body.email?.trim();

            if (!email) {
                return res.status(400).json({ success: false, message: 'Không có email hợp lệ' });
            }


            const event = await Event.findOne({ slug: req.params.slug });
            if (!event) return res.status(404).render('errors/404', { message: 'Không tìm thấy sự kiện' });
            
            const bookingCode = await createUniqueBookingCode(); // tạo mã đơn không trùng

            const booking = new BookingTicket({
                bookingCode, 
                fullName: hoVaTen,
                phone: soDienThoai,
                email,
                eventName: event.name,
                time: event.time,
                tickets,
                totalAmount
            });

            await booking.save();

            // Gửi email xác nhận
            const htmlContent = `
                <h2>Chào ${hoVaTen},</h2>
                <p>Bạn đã đặt vé thành công cho sự kiện <strong>${event.name}</strong>.</p>
                <p><strong>Số điện thoại:</strong> ${soDienThoai}</p>
                <p><strong>Mã đặt vé:</strong> #${bookingCode}</p>
                <p><strong>Thời gian:</strong> ${event.time}</p>
                <p><strong>Địa điểm:</strong> ${event.location}</p>
                <h4>Chi tiết vé:</h4>
                <ul>
                ${tickets.map(t => `
                    <li>
                    ${t.type} <br>
                    Số lượng: ${t.quantity} <br>
                    Giá: ${t.price.toLocaleString('vi-VN')} VND <br><br>
                    </li>
                `).join('')}
                </ul>
                <p><strong>Tổng tiền:</strong> ${totalAmount.toLocaleString('vi-VN')} VND</p>
                <br>
                <p>Cảm ơn bạn đã đặt vé! Vui lòng đến Địa điểm: ${event.location} trước 1 ngày để check-in nhận vé và giữ email này để kiểm tra thông tin khi cần.</p>
                <p>Khi đến check-in hãy cầm CCCD - đưa cho nhân viên Mã Đặt vé: #${bookingCode}</p>

            `;

            await sendMail({
                email,
                subject: `Xác nhận đặt vé sự kiện "${event.name}"`,
                html: htmlContent
            });

            res.json({ success: true, 
                redirectUrl: '/events/my_ticket' 
            });

        } catch (error) {
            next(error);
        }
    }

    requestCancel(req, res, next) {
        const ticketId = req.params.id;

        BookingTicket.findByIdAndUpdate(ticketId, { cancelRequest: true }, { new: true }) // Lấy bản ghi sau khi update
            .then(async (booking) => {
            if (!booking) {
                return res.status(404).send('Không tìm thấy đơn đặt vé.');
            }

            // Gửi email xác nhận đang chờ duyệt hủy vé
            const htmlContent = `
                <h2>Chào ${booking.fullName},</h2>
                <p>Bạn đã gửi <strong>yêu cầu hủy vé</strong> cho sự kiện <strong>${booking.eventName}</strong>.</p>
                <p><strong>Mã đơn hàng:</strong> #${booking.bookingCode}</p>
                <p><strong>Số điện thoại:</strong> ${booking.phone}</p>
                <p><strong>Thời gian sự kiện:</strong> ${booking.time}</p>
                <p>Yêu cầu của bạn đang được xem xét. Chúng tôi sẽ phản hồi lại sớm nhất có thể.</p>
                <br>
                <p>Trân trọng,</p>
                <p>Ban tổ chức sự kiện</p>
            `;

            await sendMail({
                email: booking.email,
                subject: `Yêu cầu hủy vé đang chờ phê duyệt - Mã #${booking.bookingCode}`,
                html: htmlContent
            });

            res.redirect('/events/my_ticket');
            })
            .catch(next);
        }
}
    // hàm tạo đơn hàng ngẫu nhiên
    async function createUniqueBookingCode() {
        let code;
        let exists = true;

        while (exists) {
            code = 'BK' + Math.floor(100000 + Math.random() * 900000); // Tạo mã 
            const existing = await BookingTicket.findOne({ bookingCode: code });
            if (!existing) exists = false;
        }

        return code;
    }




module.exports = new EventController();