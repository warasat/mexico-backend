const Patient = require("../models/Patient");
const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "fallback_secret_key", {
    expiresIn: "30d",
  });
};

// @desc    Register a new patient
// @route   POST /api/patients/register
const registerPatient = async (req, res) => {
  try {
    const { fullName, email, phone, password, confirmPassword } = req.body;

    // Validation
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Check if patient already exists
    const existingPatient = await Patient.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: existingPatient.email === email 
          ? "Email already registered" 
          : "Phone number already registered"
      });
    }

    // Create new patient
    const patient = new Patient({
      fullName,
      email,
      phone,
      password
    });

    await patient.save();

    res.status(201).json({
      success: true,
      message: "Registered successfully"
    });

  } catch (error) {
    console.error("Registration error:", error);
    
    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ")
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during registration"
    });
  }
};

// @desc    Login patient
// @route   POST /api/patients/login
const loginPatient = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find patient by email
    const patient = await Patient.findOne({ email });

    if (!patient) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Check password
    const isPasswordValid = await patient.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate token
    const token = generateToken(patient._id);

    res.json({
      success: true,
      token,
      patient: {
        id: patient._id,
        fullName: patient.fullName,
        email: patient.email,
        phone: patient.phone
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login"
    });
  }
};

module.exports = {
  registerPatient,
  loginPatient
};
