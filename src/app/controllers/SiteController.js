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





