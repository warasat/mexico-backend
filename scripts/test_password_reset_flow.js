const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test configuration
const testConfig = {
  email: 'test@example.com',
  userType: 'patient',
  newPassword: 'newPassword123'
};

async function testPasswordResetFlow() {
  console.log('🧪 Starting Password Reset Flow Test...\n');

  try {
    // Step 1: Request password reset
    console.log('📧 Step 1: Requesting password reset...');
    const forgotResponse = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
      email: testConfig.email,
      userType: testConfig.userType
    });

    console.log('✅ Forgot password request successful:', forgotResponse.data);
    console.log('📝 Note: Check your email for the 6-digit code\n');

    // Step 2: Verify reset code (you'll need to enter the actual code from email)
    console.log('🔐 Step 2: Verifying reset code...');
    console.log('⚠️  Please enter the 6-digit code from your email:');
    
    // In a real test, you would read the code from email or use a test code
    // For this demo, we'll simulate with a placeholder
    const testCode = '123456'; // Replace with actual code from email
    
    const verifyResponse = await axios.post(`${API_BASE_URL}/auth/verify-reset-code`, {
      email: testConfig.email,
      code: testCode,
      userType: testConfig.userType
    });

    console.log('✅ Code verification successful:', verifyResponse.data);
    
    if (verifyResponse.data.success && verifyResponse.data.resetToken) {
      // Step 3: Reset password
      console.log('🔑 Step 3: Resetting password...');
      const resetResponse = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email: testConfig.email,
        resetToken: verifyResponse.data.resetToken,
        newPassword: testConfig.newPassword,
        userType: testConfig.userType
      });

      console.log('✅ Password reset successful:', resetResponse.data);
      console.log('🎉 Password reset flow completed successfully!\n');
    } else {
      console.log('❌ Code verification failed or no reset token received');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      console.log('⚠️  Rate limit exceeded. Please wait before trying again.');
    }
  }
}

// Test rate limiting
async function testRateLimiting() {
  console.log('🚦 Testing Rate Limiting...\n');
  
  try {
    // Make multiple rapid requests to test rate limiting
    const promises = [];
    for (let i = 0; i < 7; i++) {
      promises.push(
        axios.post(`${API_BASE_URL}/auth/forgot-password`, {
          email: `test${i}@example.com`,
          userType: 'patient'
        }).catch(err => ({ error: err.response?.data || err.message }))
      );
    }

    const results = await Promise.all(promises);
    
    let successCount = 0;
    let rateLimitedCount = 0;
    
    results.forEach((result, index) => {
      if (result.error) {
        if (result.error.message?.includes('Too many')) {
          rateLimitedCount++;
          console.log(`Request ${index + 1}: Rate limited ✅`);
        } else {
          console.log(`Request ${index + 1}: Error - ${result.error.message}`);
        }
      } else {
        successCount++;
        console.log(`Request ${index + 1}: Success ✅`);
      }
    });

    console.log(`\n📊 Rate Limiting Test Results:`);
    console.log(`✅ Successful requests: ${successCount}`);
    console.log(`🚫 Rate limited requests: ${rateLimitedCount}`);
    
    if (rateLimitedCount > 0) {
      console.log('🎉 Rate limiting is working correctly!');
    } else {
      console.log('⚠️  Rate limiting may not be working as expected');
    }

  } catch (error) {
    console.error('❌ Rate limiting test failed:', error.message);
  }
}

// Test cleanup endpoint
async function testCleanup() {
  console.log('🧹 Testing Cleanup Endpoint...\n');
  
  try {
    const cleanupResponse = await axios.post(`${API_BASE_URL}/auth/cleanup-password-resets`);
    console.log('✅ Cleanup successful:', cleanupResponse.data);
  } catch (error) {
    console.error('❌ Cleanup test failed:', error.response?.data || error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Password Reset System Tests\n');
  console.log('=' .repeat(50));
  
  // Test 1: Rate limiting
  await testRateLimiting();
  
  console.log('\n' + '=' .repeat(50));
  
  // Test 2: Cleanup endpoint
  await testCleanup();
  
  console.log('\n' + '=' .repeat(50));
  
  // Test 3: Full password reset flow (requires manual intervention)
  console.log('📋 Manual Test Instructions:');
  console.log('1. Make sure you have a valid user account with email:', testConfig.email);
  console.log('2. Run the password reset flow manually through the frontend');
  console.log('3. Check that emails are being sent correctly');
  console.log('4. Verify that password changes invalidate existing sessions');
  
  console.log('\n🎯 To test the full flow:');
  console.log('1. Go to http://localhost:5173/forgot-password');
  console.log('2. Enter your email and user type');
  console.log('3. Check your email for the 6-digit code');
  console.log('4. Enter the code and set a new password');
  console.log('5. Try logging in with the new password');
  
  console.log('\n✨ All automated tests completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPasswordResetFlow,
  testRateLimiting,
  testCleanup
};
