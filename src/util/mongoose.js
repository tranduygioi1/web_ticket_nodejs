module.exports = {
    multipleMongooseToObject: function (mongooses) {
        return mongooses.map(item => {
            return typeof item.toObject === 'function' ? item.toObject() : item;
        });
    },
    mongooseToObject: function (mongoose) {
        return mongoose && typeof mongoose.toObject === 'function'
            ? mongoose.toObject()
            : mongoose;
    }
};
