const express = require('express')
const router = express.Router()

const eventsController = require('../app/controllers/EventController')

router.get('/search', eventsController.search)

router.get('/my_ticket', eventsController.myticket)

router.post('/my_ticket/request-cancel/:id', eventsController.requestCancel);

router.get('/:slug/select_ticket', eventsController.select_ticket);

router.get('/:slug/select_ticket/confirm_booking', eventsController.confirm_booking);

router.post('/:slug/select_ticket/confirm_booking', eventsController.saveBooking);

//router.get('/:slug/select_ticket/confirm_booking/payment', eventsController.payment);

router.get('/:slug', eventsController.show)

module.exports = router