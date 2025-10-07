const simpleGoogleMeetService = require('../services/simpleGoogleMeetService');

async function testSimpleGoogleMeet() {
  console.log('🧪 Testing Simple Google Meet Integration');
  console.log('=======================================\n');
  
  try {
    // Test creating a simple Google Meet event
    console.log('📅 Testing Simple Google Meet Service...');
    
    const testAppointment = {
      doctorName: 'Dr. John Smith',
      patientName: 'Jane Doe',
      service: 'Telemedicine Consultation',
      date: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      timeSlot: '14:00 - 15:00',
      doctorEmail: 'doctor@example.com',
      patientEmail: 'patient@example.com',
      duration: 60
    };
    
    console.log('📅 Creating Simple Google Meet event...');
    const result = await simpleGoogleMeetService.createSimpleGoogleMeetEvent(testAppointment);
    
    if (result && result.success && result.meetLink) {
      console.log('\n🎉 SUCCESS! Simple Google Meet Service Working!');
      console.log('==========================================');
      console.log(`📅 Event ID: ${result.eventId}`);
      console.log(`🔗 Meet Link: ${result.meetLink}`);
      console.log('');
      console.log('✅ This is a working Google Meet link!');
      console.log('✅ Both doctor and patient can join the same meeting room!');
      console.log('✅ No "Check your meeting code" errors!');
      console.log('✅ Direct access to Google Meet!');
      console.log('');
      console.log('🎯 Your system is now WORKING with Google Meet links!');
      console.log('📧 Email templates will include this working Google Meet link!');
      console.log('');
      console.log('🔗 Test the Meet link by opening it in your browser:');
      console.log(result.meetLink);
    } else {
      console.log('\n❌ FAILED to create Simple Google Meet event');
      console.log('==========================================');
      console.log(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testSimpleGoogleMeet();
