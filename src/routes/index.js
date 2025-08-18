const siteRouter = require('./site')
const eventsRouter = require('./events')
const adminRouter  = require('./admin')
const userRouter  = require('./user')





function route (app){
    app.use('/events', eventsRouter)

    app.use('/admin', adminRouter)

    app.use('/user', userRouter)

    app.use('/', siteRouter)

}

module.exports = route
