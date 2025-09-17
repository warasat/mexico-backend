const express = require("express");
const { registerPatient, loginPatient } = require("../controllers/patientController");
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const patientProfile = require('../controllers/patientProfileController');

const router = express.Router();

// Patient authentication routes
router.post("/register", registerPatient);
router.post("/login", loginPatient);

// Patient profile routes
router.get('/me', auth, patientProfile.getMe);
router.put('/me', auth, patientProfile.updateMe);
router.post('/me/upload-image', auth, upload.single('image'), patientProfile.uploadImage);

module.exports = router;
