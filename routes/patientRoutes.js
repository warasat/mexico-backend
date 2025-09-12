const express = require("express");
const { registerPatient, loginPatient } = require("../controllers/patientController");

const router = express.Router();

// Patient authentication routes
router.post("/register", registerPatient);
router.post("/login", loginPatient);

module.exports = router;
