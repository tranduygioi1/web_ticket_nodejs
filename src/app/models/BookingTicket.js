const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TicketSchema = new Schema({
    type: String,   
    price: Number,
    quantity: Number,
    total: Number
}, { _id: false }); 

const BookingTicketSchema = new Schema({
    bookingCode: { type: String, unique: true, required: true },
    fullName: String,
    phone: String,
    email: String,
    eventName: String,
    time: { type: String },
    tickets: [TicketSchema],  
    totalAmount: Number,
    createdAt: { type: Date, default: Date.now },

    cancelRequest: { type: Boolean, default: false },  // Người dùng yêu cầu hủy
    isCanceled: { type: Boolean, default: false }      // Admin duyệt => hủy thực sự    

});

module.exports = mongoose.model('BookingTicket', BookingTicketSchema, 'booking_ticket');
