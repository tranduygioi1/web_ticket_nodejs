const express = require('express')
const router = express.Router()

const adminController = require('../app/controllers/AdminController')

router.get('/', adminController.admin)

router.post('/login', adminController.xulylogin)

router.get('/manage_admin', adminController.manageAdmin);
router.post('/add_admin', adminController.addAdmin);
router.post('/delete_admin/:id', adminController.deleteAdmin);

router.get('/manage_roles', adminController.manage_roles)
router.post('/add_role', adminController.addRole)
router.post('/delete_role/:id', adminController.deleteRole);

router.get('/assign_roles', adminController.assign_roles)


router.post('/addevent', adminController.addevent)
router.get('/create_event', adminController.create)

router.get('/list_event', adminController.listOrSearch);

router.get('/booking_management', adminController.booking_management);
router.post('/booking_management/confirm-cancel/:id', adminController.confirmCancel);
router.get('/booking_management/success', adminController.bookingSuccess);
router.get('/booking_management/pending', adminController.bookingPending);
router.get('/booking_management/canceled', adminController.bookingCanceled);

//Các route động xuống dưới
router.get('/:id/update_event', adminController.update)
router.put('/:id', adminController.edit)
router.delete('/:id', adminController.delete)

module.exports = router
