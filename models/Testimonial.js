const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema({
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 5
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
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Testimonial", testimonialSchema);
