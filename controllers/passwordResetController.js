const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const PasswordReset = require('../models/PasswordReset');
const Patient = require('../models/Patient');
const DoctorAuth = require('../models/DoctorAuth');
const Admin = require('../models/Admin');
const { sendEmail } = require('../utils/nodeMailer');

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

// Helper function to check rate limit
const checkRateLimit = (email, maxRequests = 5, windowMs = 60 * 60 * 1000) => {
  const now = Date.now();
  const key = `reset_${email}`;
  
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  const data = rateLimitStore.get(key);
  
  if (now > data.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (data.count >= maxRequests) {
    return false;
  }
  
  data.count++;
  return true;
};

// Helper function to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to generate secure token
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Helper function to get user model by type
const getUserModel = (userType) => {
  switch (userType) {
    case 'patient':
      return Patient;
    case 'doctor':
      return DoctorAuth;
    case 'admin':
      return Admin;
    default:
      throw new Error('Invalid user type');
  }
};

// Helper function to get user by email and type
const findUserByEmail = async (email, userType) => {
  const UserModel = getUserModel(userType);
  return await UserModel.findOne({ email: email.toLowerCase().trim() });
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email, userType = 'patient' } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    if (!['patient', 'doctor', 'admin'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type"
      });
    }

    // Check rate limit
    if (!checkRateLimit(email)) {
      return res.status(429).json({
        success: false,
        message: "Too many reset requests. Please try again later."
      });
    }

    // Check if user exists (generic response for security)
    const user = await findUserByEmail(email, userType);
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return res.json({
        success: true,
        message: "If an account with that email exists, a reset code has been sent."
      });
    }

    // Clean up any existing reset records for this email
    await PasswordReset.deleteMany({ 
      email: email.toLowerCase().trim(), 
      userType 
    });

    // Generate OTP and secure token
    const otp = generateOTP();
    const secureToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create password reset record
    const passwordReset = new PasswordReset({
      email: email.toLowerCase().trim(),
      userType,
      tokenHash: otp, // Will be hashed by pre-save middleware
      expiresAt,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    await passwordReset.save();

    // Send OTP email
    const emailSubject = 'Password Reset Code - Medical App';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${user.fullName || 'User'},</p>
        <p>You have requested to reset your password. Use the following code to verify your identity:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        <p><strong>This code will expire in 10 minutes.</strong></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;

    try {
      await sendEmail(email, emailSubject, emailHtml);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Don't fail the request if email fails, but log it
    }

    res.json({
      success: true,
      message: "If an account with that email exists, a reset code has been sent."
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password reset request"
    });
  }
};

// @desc    Verify reset code
// @route   POST /api/auth/verify-reset-code
const verifyResetCode = async (req, res) => {
  try {
    const { email, code, userType = 'patient' } = req.body;

    // Validation
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and code are required"
      });
    }

    if (!['patient', 'doctor', 'admin'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type"
      });
    }

    // Find the password reset record
    const passwordReset = await PasswordReset.findOne({
      email: email.toLowerCase().trim(),
      userType,
      used: false,
      expiresAt: { $gt: new Date() }
    });

    if (!passwordReset) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset code"
      });
    }

    // Check attempt limit
    if (passwordReset.attempts >= 5) {
      await PasswordReset.findByIdAndUpdate(passwordReset._id, { used: true });
      return res.status(400).json({
        success: false,
        message: "Too many failed attempts. Please request a new reset code."
      });
    }

    // Verify the code
    const isValidCode = await passwordReset.verifyToken(code);

    if (!isValidCode) {
      // Increment attempts
      await PasswordReset.findByIdAndUpdate(passwordReset._id, {
        $inc: { attempts: 1 }
      });

      return res.status(400).json({
        success: false,
        message: "Invalid reset code"
      });
    }

    // Generate short-lived reset token
    const resetToken = jwt.sign(
      { 
        email: email.toLowerCase().trim(), 
        userType, 
        resetId: passwordReset._id,
        type: 'password_reset'
      },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '15m' } // 15 minutes
    );

    res.json({
      success: true,
      canReset: true,
      resetToken
    });

  } catch (error) {
    console.error("Verify reset code error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during code verification"
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword, userType = 'patient' } = req.body;

    // Validation
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, reset token, and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    if (!['patient', 'doctor', 'admin'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user type"
      });
    }

    // Verify reset token
    let tokenPayload;
    try {
      tokenPayload = jwt.verify(resetToken, process.env.JWT_SECRET || 'fallback_secret_key');
    } catch (tokenError) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Validate token payload
    if (tokenPayload.type !== 'password_reset' || 
        tokenPayload.email !== email.toLowerCase().trim() ||
        tokenPayload.userType !== userType) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token"
      });
    }

    // Find and validate password reset record
    const passwordReset = await PasswordReset.findById(tokenPayload.resetId);
    if (!passwordReset || 
        passwordReset.used || 
        passwordReset.email !== email.toLowerCase().trim() ||
        passwordReset.userType !== userType) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Find user
    const user = await findUserByEmail(email, userType);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found"
      });
    }

    // Update password
    user.password = newPassword;
    await user.save(); // This will hash the password and increment passwordVersion

    // Mark reset record as used
    await PasswordReset.findByIdAndUpdate(passwordReset._id, { used: true });

    // Send confirmation email
    const emailSubject = 'Password Reset Successful - Medical App';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Password Reset Successful</h2>
        <p>Hello ${user.fullName || 'User'},</p>
        <p>Your password has been successfully reset. If you did not make this change, please contact support immediately.</p>
        <p>For security reasons, all your existing sessions have been invalidated. You will need to log in again.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;

    try {
      await sendEmail(email, emailSubject, emailHtml);
    } catch (emailError) {
      console.error('Confirmation email sending failed:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: "Password has been reset successfully"
    });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during password reset"
    });
  }
};

// @desc    Clean up expired password reset records (cron job)
// @route   POST /api/auth/cleanup-password-resets
const cleanupPasswordResets = async (req, res) => {
  try {
    const result = await PasswordReset.cleanupExpired();
    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} expired password reset records`
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during cleanup"
    });
  }
};

module.exports = {
  forgotPassword,
  verifyResetCode,
  resetPassword,
  cleanupPasswordResets
};
