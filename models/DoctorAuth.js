const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const doctorAuthSchema = new mongoose.Schema({
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
doctorAuthSchema.pre("save", async function(next) {
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

// Compare password method
doctorAuthSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
doctorAuthSchema.methods.toJSON = function() {
  const doctor = this.toObject();
  delete doctor.password;
  return doctor;
};

module.exports = mongoose.model("DoctorAuth", doctorAuthSchema);
