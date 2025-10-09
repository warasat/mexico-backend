const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DoctorProfile',
    required: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  patientName: {
    type: String,
    required: true,
  },
  patientEmail: {
    type: String,
    required: true,
  },
  isApproved: {
    type: Boolean,
    default: true, // Reviews are auto-approved for simplicity
  },
}, { timestamps: true });

// Ensure a patient can only review a doctor once
ReviewSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });
// Index for efficient fetching of reviews for a doctor, sorted by newest
ReviewSchema.index({ doctorId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
