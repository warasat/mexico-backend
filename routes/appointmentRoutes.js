const express = require('express');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/appointmentController');

const router = express.Router();

router.post('/appointments', auth, express.json({ limit: '1mb' }), ctrl.createAppointment);
router.get('/appointments/me', auth, ctrl.getMyAppointments);
router.get('/appointments/doctor/me', auth, ctrl.getDoctorAppointments);
router.get('/appointments/:id', auth, ctrl.getAppointmentById);
router.put('/appointments/:id/status', auth, express.json({ limit: '256kb' }), ctrl.updateAppointmentStatus);
router.put('/appointments/:id/cancel', auth, ctrl.cancelAppointment);

module.exports = router;


