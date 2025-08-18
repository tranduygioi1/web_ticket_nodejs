const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AdminSchema = new Schema({
    username: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['event_admin', 'ticket_admin'], required: true }
});

module.exports = mongoose.model('Admin', AdminSchema, 'admin');