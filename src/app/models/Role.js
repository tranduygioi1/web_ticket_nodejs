const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RoleSchema = new Schema({
  role_name: { type: String, required: true, unique: true },
  description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema, 'manage_roles');
