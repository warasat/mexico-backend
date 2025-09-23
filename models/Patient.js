const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  fullName: { 
    type: String, 
    required: [true, "Full name is required"],
    trim: true,
    minlength: [2, "Full name must be at least 2 characters long"]
  },
  email: { 
    type: String, 
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
  },
  phone: { 
    type: String, 
    required: [true, "Phone number is required"],
    unique: true,
    trim: true
  },
  password: { 
    type: String, 
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters long"]
  }
}, {
  timestamps: true
});

// Hash password before saving
patientSchema.pre("save", async function(next) {
  if (!this.isModified("password")) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Generate patientId if missing (format: PTXXXXXX numeric unique)
patientSchema.pre("save", async function(next) {
  if (this.patientId) return next();
  try {
    const Model = this.constructor;
    for (let i = 0; i < 5; i++) {
      const num = Math.floor(100000 + Math.random() * 900000); // 6-digit
      const candidate = `PT${num}`;
      const exists = await Model.findOne({ patientId: candidate }).lean();
      if (!exists) {
        this.patientId = candidate;
        return next();
      }
    }
    // Fallback: derive from _id
    this.patientId = `PT${String(this._id).slice(-6).toUpperCase()}`;
    return next();
  } catch (err) {
    return next(err);
  }
});

// Compare password method
patientSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
patientSchema.methods.toJSON = function() {
  const patient = this.toObject();
  delete patient.password;
  return patient;
};

module.exports = mongoose.model("Patient", patientSchema);
