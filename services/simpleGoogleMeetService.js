// const { google } = require('googleapis');
// const fs = require('fs');
// const path = require('path');

// class GoogleMeetService {
//   constructor() {
//     this.auth = null;
//     this.calendar = null;
//     this.credentials = null;
//     this.initializeAuth();
//   }

//   // ✅ Initialize OAuth2 authentication
//   initializeAuth() {
//     try {
//       const credentialsPath = path.join(__dirname, '../config/service-account.json');
//       this.credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

//       const { client_id, client_secret, redirect_uri, access_token, refresh_token } = this.credentials;

//       const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
//       oauth2Client.setCredentials({
//         access_token,
//         refresh_token,
//       });

//       this.auth = oauth2Client;
//       this.calendar = google.calendar({ version: 'v3', auth: this.auth });

//       // console.log('✅ Google Meet Service initialized successfully');
//     } catch (err) {
//       console.error('❌ Error initializing Google Meet Service:', err.message);
//     }
//   }

//   // ✅ Create a Google Calendar event with Meet link
//   async createEvent({ doctorName, patientName, doctorEmail, patientEmail, service, date, timeSlot, duration = 60 }) {
//     try {
//       const [startTime] = timeSlot.split(' - ');
//       const [hour, minute] = startTime.split(':').map(Number);

//       const startDate = new Date(date);
//       startDate.setHours(hour, minute, 0, 0);
//       const endDate = new Date(startDate);
//       endDate.setMinutes(endDate.getMinutes() + duration);

//       const event = {
//         summary: `Consultation: ${service}`,
//         description: `Appointment between Dr. ${doctorName} and ${patientName}`,
//         start: { dateTime: startDate.toISOString(), timeZone: 'UTC' },
//         end: { dateTime: endDate.toISOString(), timeZone: 'UTC' },
//         attendees: [
//           { email: doctorEmail },
//           { email: patientEmail },
//         ],
//         conferenceData: {
//           createRequest: {
//             requestId: `meet-${Date.now()}`,
//             conferenceSolutionKey: { type: 'hangoutsMeet' },
//           },

//         },
//          attendees: [
//       { email: doctorEmail },
//       { email: patientEmail },
//     ],
//     sendUpdates: 'all',
//       };

//       const response = await this.calendar.events.insert({
//         calendarId: 'primary',
//         requestBody: event,
//         conferenceDataVersion: 1,
//         sendUpdates: 'all', // 📩 Sends invites to attendees automatically
//       });

//       const meetLink = response.data.conferenceData?.entryPoints?.[0]?.uri || null;
//       // console.log('✅ Google Meet Link Created:', meetLink);

//       return {
//         success: true,
//         meetLink,
//         eventId: response.data.id,
//       };
//     } catch (error) {
//       console.error('❌ Failed to create Google Meet event:', error.message);
//       return { success: false, message: error.message };
//     }
//   }

//   // ✅ Delete event (used in cancellation)
//   async deleteEvent(eventId) {
//     try {
//       await this.calendar.events.delete({
//         calendarId: 'primary',
//         eventId,
//       });
//       return true;
//     } catch (error) {
//       console.error('❌ Failed to delete event:', error.message);
//       return false;
//     }
//   }
// }

// module.exports = new GoogleMeetService();