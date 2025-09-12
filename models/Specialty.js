const mongoose = require("mongoose");

const specialtySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  doctorCount: {
    type: Number,
    default: 0
  },
  imageUrl: {
    type: String,
    required: true
  },
  iconUrl: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create slug from name before saving
specialtySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
  }
  next();
});

module.exports = mongoose.model("Specialty", specialtySchema);
