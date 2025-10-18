const express = require("express");
const {
  forgotPassword,
  verifyResetCode,
  resetPassword,
  cleanupPasswordResets
} = require("../controllers/passwordResetController");
const rateLimiter = require("../middleware/rateLimiter");

const router = express.Router();

// Rate limiting for password reset endpoints
const passwordResetLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many password reset requests. Please try again later.",
  keyGenerator: (req) => `password_reset_${req.body.email || req.ip}`
});

const verifyCodeLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 verification attempts per window
  message: "Too many verification attempts. Please try again later.",
  keyGenerator: (req) => `verify_code_${req.body.email || req.ip}`
});

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post("/forgot-password", passwordResetLimiter, forgotPassword);

// @route   POST /api/auth/verify-reset-code
// @desc    Verify reset code
// @access  Public
router.post("/verify-reset-code", verifyCodeLimiter, verifyResetCode);

// @route   POST /api/auth/reset-password
// @desc    Reset password
// @access  Public
router.post("/reset-password", passwordResetLimiter, resetPassword);

// @route   POST /api/auth/cleanup-password-resets
// @desc    Clean up expired password reset records
// @access  Private (Admin only)
router.post("/cleanup-password-resets", cleanupPasswordResets);

module.exports = router;
