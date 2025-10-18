# Forgot Password Implementation

This document describes the complete forgot password functionality implemented for the medical application.

## Overview

The forgot password system provides a secure, multi-step process for users to reset their passwords when they forget them. It includes rate limiting, session invalidation, and comprehensive security measures.

## Features

### ✅ Security Features
- **6-digit OTP generation** with 10-minute expiry
- **Rate limiting** (5 requests per 15 minutes per email)
- **Password version tracking** for session invalidation
- **Secure token hashing** before database storage
- **Attempt limiting** (5 verification attempts per reset)
- **Generic responses** to prevent email enumeration
- **HTTPS enforcement** (production ready)

### ✅ User Experience
- **Multi-step UI flow** with clear progress indication
- **Real-time password strength meter**
- **Auto-advance on code entry** (6-digit input)
- **Resend code functionality** with timer
- **Responsive design** for all devices
- **Loading states** and error handling

### ✅ Email Integration
- **Professional email templates** with branding
- **OTP delivery** with clear instructions
- **Confirmation emails** after successful reset
- **Error handling** for email delivery failures

## API Endpoints

### 1. Request Password Reset
```
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "userType": "patient" // or "doctor" or "admin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account with that email exists, a reset code has been sent."
}
```

### 2. Verify Reset Code
```
POST /api/auth/verify-reset-code
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "userType": "patient"
}
```

**Response:**
```json
{
  "success": true,
  "canReset": true,
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Code verified successfully"
}
```

### 3. Reset Password
```
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newSecurePassword123",
  "userType": "patient"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

## Database Schema

### PasswordReset Model
```javascript
{
  email: String (required, indexed),
  userType: String (required, enum: ['patient', 'doctor', 'admin']),
  tokenHash: String (required, hashed),
  expiresAt: Date (required, TTL index),
  used: Boolean (default: false, indexed),
  attempts: Number (default: 0, max: 5),
  ipAddress: String,
  userAgent: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Updated User Models
Both `Patient` and `DoctorAuth` models now include:
```javascript
{
  // ... existing fields
  passwordVersion: Number (default: 1)
}
```

## Frontend Flow

### Step 1: Email Input
- User selects account type (Patient/Doctor/Admin)
- Email validation with real-time feedback
- Rate limiting feedback if applicable

### Step 2: Code Verification
- 6-digit code input with auto-advance
- 10-minute countdown timer
- Resend code functionality
- Attempt limit tracking

### Step 3: New Password
- Password strength meter (5 levels)
- Confirm password validation
- Show/hide password toggles
- Real-time validation feedback

### Step 4: Success
- Confirmation message
- Automatic redirect to sign-in
- Session invalidation notice

## Security Implementation

### Rate Limiting
- **Password reset requests**: 5 per 15 minutes per email
- **Code verification**: 10 attempts per 15 minutes per email
- **IP-based limiting**: Additional protection against abuse

### Session Invalidation
- Password version incremented on password change
- JWT tokens include password version
- Middleware checks password version on each request
- Automatic logout on password version mismatch

### Token Security
- OTP tokens hashed with bcrypt before storage
- Reset tokens are JWT with 15-minute expiry
- Secure random token generation
- TTL indexes for automatic cleanup

## File Structure

### Backend Files
```
mexico-backend/
├── models/
│   ├── PasswordReset.js          # Password reset model
│   ├── Patient.js                # Updated with passwordVersion
│   └── DoctorAuth.js             # Updated with passwordVersion
├── controllers/
│   └── passwordResetController.js # Main controller logic
├── routes/
│   └── passwordResetRoutes.js    # API routes with rate limiting
├── middleware/
│   ├── auth.js                   # Updated with password version check
│   └── rateLimiter.js            # Rate limiting middleware
└── scripts/
    └── test_password_reset_flow.js # Test script
```

### Frontend Files
```
mexico-frontend/src/
├── feature-module/frontend/pages/forgot-password/
│   └── index.tsx                 # Main forgot password component
├── core/services/
│   └── passwordResetService.ts   # API service layer
└── routes/
    └── router.link.tsx           # Updated with forgot password route
```

## Testing

### Automated Tests
Run the test script to verify functionality:
```bash
cd mexico-backend
node scripts/test_password_reset_flow.js
```

### Manual Testing
1. Navigate to `http://localhost:5173/forgot-password`
2. Test the complete flow with a valid user account
3. Verify email delivery and code functionality
4. Test rate limiting by making multiple requests
5. Verify session invalidation after password reset

## Environment Variables

Ensure these environment variables are set:
```env
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```

## Production Considerations

### Email Service
- Configure production email service (SendGrid, AWS SES, etc.)
- Update email templates with production branding
- Set up email delivery monitoring

### Rate Limiting
- Replace in-memory rate limiter with Redis for production
- Configure appropriate rate limits for your use case
- Monitor rate limiting metrics

### Security
- Ensure HTTPS is enforced in production
- Regular security audits of the password reset flow
- Monitor for suspicious activity patterns

### Database
- Set up proper database indexes for performance
- Configure TTL cleanup jobs for expired records
- Regular backup and monitoring

## Troubleshooting

### Common Issues

1. **Email not sending**
   - Check email service configuration
   - Verify environment variables
   - Check email service logs

2. **Rate limiting too strict**
   - Adjust rate limit values in `rateLimiter.js`
   - Consider user feedback for rate limit messages

3. **Session not invalidating**
   - Verify password version is being incremented
   - Check JWT token includes password version
   - Ensure middleware is checking password version

4. **Frontend routing issues**
   - Verify route is added to `router.link.tsx`
   - Check component imports are correct
   - Ensure API base URL is configured

## Support

For issues or questions regarding the forgot password implementation:
1. Check the test script output for automated verification
2. Review the API endpoint responses for error details
3. Check browser console for frontend errors
4. Verify database records for password reset attempts

## Future Enhancements

Potential improvements for future versions:
- SMS-based OTP as alternative to email
- Biometric authentication integration
- Advanced password policies
- Multi-factor authentication
- Password history tracking
- Account lockout policies
