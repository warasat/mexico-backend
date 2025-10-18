const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const passwordResetSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
    index: true
  },
  userType: {
    type: String,
    required: [true, "User type is required"],
    enum: ['patient', 'doctor', 'admin']
  },
  tokenHash: {
    type: String,
    required: [true, "Token hash is required"]
  },
  expiresAt: {
    type: Date,
    required: [true, "Expiration date is required"],
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
  },
  used: {
    type: Boolean,
    default: false,
    index: true
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Hash token before saving
passwordResetSchema.pre("save", async function(next) {
  if (!this.isModified("tokenHash")) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.tokenHash = await bcrypt.hash(this.tokenHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to verify token
passwordResetSchema.methods.verifyToken = async function(candidateToken) {
  return await bcrypt.compare(candidateToken, this.tokenHash);
};

// Static method to clean up expired records
passwordResetSchema.statics.cleanupExpired = async function() {
  return await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { used: true }
    ]
  });
};

// Index for efficient queries
passwordResetSchema.index({ email: 1, userType: 1, used: 1 });
passwordResetSchema.index({ createdAt: 1 });

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
