const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/doctorProfileController');

// Public
router.get('/doctors', ctrl.listDoctors);

// Protected - place specific routes BEFORE dynamic ':id' to avoid conflicts
router.get('/doctors/me', auth, ctrl.getMe);
router.put('/doctors/me', auth, express.json({ limit: '1mb' }), ctrl.updateMe);
router.post('/doctors/me/upload-image', auth, upload.single('image'), ctrl.uploadImage);
router.patch('/doctors/me/availability', auth, express.json({ limit: '256kb' }), ctrl.updateAvailability);

// Availability schedule APIs (place before dynamic :id)
router.get('/doctor/availability/:doctorId', ctrl.getAvailabilityByDoctorId);
router.post('/doctor/availability', auth, express.json({ limit: '512kb' }), ctrl.saveAvailabilityForMe);

// Public dynamic must come after the above
router.get('/doctors/:id', ctrl.getDoctorById);

module.exports = router;


