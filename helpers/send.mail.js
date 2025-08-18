require("dotenv").config()
const nodemailer = require('nodemailer')

const sendMail = async ({ email, subject, html }) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', // sửa đúng lại ở đây
        service: "Gmail",
        auth: {
            user: process.env.EMAIL_USER, // ví dụ: your_email@gmail.com
            pass: process.env.EMAIL_PASS  // ví dụ: mật khẩu ứng dụng
        }
    })

    const message = {
        from: 'ADMIN FROM GIOI',
        to: email,
        subject: subject,
        html: html
    }

    console.log("Sending mail to:", email);
const result = await transporter.sendMail(message);
console.log("Result:", result);

    return result
}

module.exports = sendMail
