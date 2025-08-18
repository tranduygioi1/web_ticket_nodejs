const Event = require('../models/Event');
const { multipleMongooseToObject } = require('../../util/mongoose');

class SiteController {
  //[GET] /
  index(req, res, next) {
    Promise.all([
      Event.aggregate([{ $sample: { size: 2 } }]),              // bannerEvents
      Event.find({ category: 'special' }),                      // Sự kiện đặc biệt
      Event.find({ category: 'trending' }),                     // Sự kiện xu hướng
      Event.find({ category: 'foryou' }),                       // Dành cho bạn
      Event.find({ category: 'livemusic' }),                    // Nhạc sống
      Event.find({ category: 'stageart' }),                     // Sân khấu và nghệ thuật
      Event.find({})                                            // allEvent nếu bạn vẫn cần
    ])
      .then(([randomEvents, specialEvents, trendingEvents, forYouEvents, liveMusicEvents, stageArtEvents, allEvent]) => {
        res.render('home', {
          isHome: true,
          bannerEvents: multipleMongooseToObject(randomEvents),
          specialEvents: multipleMongooseToObject(specialEvents),
          trendingEvents: multipleMongooseToObject(trendingEvents),
          forYouEvents: multipleMongooseToObject(forYouEvents),
          liveMusicEvents: multipleMongooseToObject(liveMusicEvents),
          stageArtEvents: multipleMongooseToObject(stageArtEvents),
          allEvent: multipleMongooseToObject(allEvent), // nếu cần dùng ở nơi khác
        });
      })
      .catch(next);
  }
}

module.exports = new SiteController();



// const Event = require('../models/Event');
// const { multipleMongooseToObject } = require('../../util/mongoose');

// class SiteController {
//     //[GET] /
//     index(req, res, next) {
//         Promise.all([
//             Event.find({}).limit(3),   // Banner – chỉ 3 bản ghi
//             Event.find({})            // Tất cả dữ liệu – dùng cho phần khác
//         ])
//         .then(([bannerEvents, allEvent]) => {
//             res.render('home', {
//                 bannerEvents: multipleMongooseToObject(bannerEvents),
//                 allEvent: multipleMongooseToObject(allEvent)
//             });
//         })
//         .catch(next);
//     }

//     //[GET] /search
//     search(req, res) {
//         res.render('search');
//     }
// }

// module.exports = new SiteController();



