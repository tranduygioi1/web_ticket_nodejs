const moment = require('moment');

module.exports = {
  sum: (a, b) => a + b,

  eq: (a, b) => a === b,

  json: (context) => JSON.stringify(context),

  formatDate: (date) => {
    return moment(date).format('DD/MM/YYYY HH:mm'); // mới, mặc định format gọn
  },

  uppercaseFirst: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  getDateOnly: (time) => {
    if (!time) return '';
    const parts = time.split(',');
    if (parts.length === 3) {
      return parts[1].trim() + ', ' + parts[2].trim();
    }
    return '';
  },

  formatNumber: (number) => {
    if (typeof number !== 'number') number = Number(number);
    if (isNaN(number)) return number;
    return number.toLocaleString('vi-VN');
  },
};
