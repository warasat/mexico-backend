const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  specialty: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    default: 0
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  available: {
    type: Boolean,
    default: true
  },
  duration: {
    type: Number,
    required: true,
    default: 30 // in minutes
  },
  featured: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true
  },
  experience: {
    type: Number,
    default: 0 // years of experience
  },
  consultationFee: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Doctor", doctorSchema);
