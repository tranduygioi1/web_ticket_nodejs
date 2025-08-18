const mongoose = require('mongoose');
const slugify = require('slugify');
const Schema = mongoose.Schema;

const Event = new Schema({
  name: { type: String },
  description: { type: String }, // sửa từ "descripton" thành đúng chính tả
  image: { type: String },
  location: { type: String },
  time: { type: String },
  slug: { type: String, unique: true },
  category: { type: String },

  // Sửa kiểu `prices` từ Array sang mảng object có cấu trúc rõ ràng
  prices: [
    {
      type: { type: String },  
      price: { type: String }  
    }
  ],

    createAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});


// Tạo slug tự động từ name
Event.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Event', Event, 'allEvent');
