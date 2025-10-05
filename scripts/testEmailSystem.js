/**
 * Test Email Notification System
 * 
 * This script tests the email notification system for appointment booking
 */

const { sendEmail } = require('../utils/nodeMailer');

// Email template function (same as in controller)
function appointmentEmailTemplate({
  doctorName,
  patientName,
  service,
  date,
  timeSlot,
  mode,
  location,
  insurance,
  symptoms,
  notes,
}) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="background: #0d6efd; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
      <h2 style="margin: 0;">New Appointment Request</h2>
    </div>

    <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
      <p>Hello <b>${doctorName}</b>,</p>
      <p>You have a new appointment request from <b>${patientName}</b>.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td><b>Service:</b></td><td>${service}</td></tr>
        <tr><td><b>Date:</b></td><td>${formattedDate}</td></tr>
        <tr><td><b>Time Slot:</b></td><td>${timeSlot}</td></tr>
        <tr><td><b>Mode:</b></td><td>${mode === 'video' ? 'Video Consultation' : 'Clinic Visit'}</td></tr>
        ${location ? `<tr><td><b>Location:</b></td><td>${location}</td></tr>` : ''}
        ${insurance ? `<tr><td><b>Insurance:</b></td><td>${insurance}</td></tr>` : ''}
        ${symptoms ? `<tr><td><b>Symptoms:</b></td><td>${symptoms}</td></tr>` : ''}
        ${notes ? `<tr><td><b>Notes:</b></td><td>${notes}</td></tr>` : ''}
      </table>

      <p style="margin-top: 24px;">Please log in to your dashboard to accept or decline this appointment.</p>

      <p style="color: #888; font-size: 13px;">This is an automated message. Please do not reply.</p>
    </div>
  </div>
  `;
}

async function testEmailSystem() {
  console.log('🧪 Testing Email Notification System...\n');
  
  try {
    // Test data
    const testData = {
      doctorName: 'Dr. Test Doctor',
      patientName: 'Test Patient',
      service: 'General Consultation',
      date: new Date(),
      timeSlot: '10:00 AM - 11:00 AM',
      mode: 'video',
      location: 'Online',
      insurance: 'Test Insurance',
      symptoms: 'Test symptoms for email verification',
      notes: 'This is a test email to verify the email system is working correctly.',
    };

    // Generate HTML email
    const html = appointmentEmailTemplate(testData);
    
    console.log('📧 Sending test email...');
    console.log('To: appointment@gmail.com');
    console.log('Subject: New Appointment Request from Test Patient');
    
    // Send test email
    const result = await sendEmail(
      'appointment@gmail.com', // Send to yourself for testing
      'New Appointment Request from Test Patient',
      html
    );

    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`📧 Message ID: ${result.messageId}`);
      console.log('\n🎉 Email notification system is working correctly!');
      console.log('📬 Check your inbox for the test email.');
    } else {
      console.error('❌ Email failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Verify the Gmail credentials are correct');
    console.log('2. Make sure 2-Step Verification is enabled');
    console.log('3. Use App Password (not regular password)');
    console.log('4. Check if Gmail SMTP is not blocked by firewall');
  }
}

// Run the test
testEmailSystem()
  .then(() => {
    console.log('\n✨ Email test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });

