const mongoose = require("mongoose");

const landingPageSchema = new mongoose.Schema({
  // Hero Section
  hero: {
    title: {
      type: String,
      required: true,
      trim: true
    },
    subtitle: {
      type: String,
      required: true,
      trim: true
    },
    ctaText: {
      type: String,
      required: true,
      trim: true
    },
    imageUrl: {
      type: String,
      required: true
    },
    stats: {
      appointments: {
        type: String,
        required: true,
        default: "5K+"
      },
      rating: {
        type: String,
        required: true,
        default: "5.0"
      }
    }
  },
  
  // Statistics
  stats: {
    doctorsAvailable: {
      type: Number,
      required: true,
      default: 300
    },
    specialities: {
      type: Number,
      required: true,
      default: 18
    },
    bookingsDone: {
      type: Number,
      required: true,
      default: 30000
    },
    hospitalsClinics: {
      type: Number,
      required: true,
      default: 97
    },
    labTests: {
      type: Number,
      required: true,
      default: 317
    }
  },

  // Services
  services: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    }
  }],

  // Reasons to choose us
  reasons: [{
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    icon: {
      type: String,
      required: true,
      trim: true
    }
  }],

  // Company logos for testimonials section
  companyLogos: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    imageUrl: {
      type: String,
      required: true
    }
  }],

  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("LandingPage", landingPageSchema);
