const { sendEmail } = require('../utils/nodeMailer');
const { randomUUID } = require('crypto');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const Patient = require('../models/Patient');
const mongoose = require('mongoose');
const GoogleMeetService = require('../services/simpleGoogleMeetService'); // ✅ Real Meet API service import

// ✅ Generate fallback Google Meet link (in case API fails)
function generateMeetLink() {
  const uniqueId = crypto.randomBytes(6).toString('hex');
  return `https://meet.google.com/${uniqueId}`;
}

function generateId() {
  try {
    return randomUUID();
  } catch (_) {
    return 'apt_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
}

function toApiResponse(list) {
  return {
    success: true,
    count: list.length,
    data: list,
  };
}

function buildAppointmentId(id) {
  const s = String(id || '');
  return `APT${s.slice(-6).toUpperCase()}`;
}

function shapeAppointmentForFrontend(doc) {
  if (!doc) return doc;
  const shaped = {
    ...doc,
    _id: String(doc._id),
    appointmentId: doc.appointmentId || buildAppointmentId(doc._id),
    bookingId: doc.bookingId || String(doc._id),
    doctorName: doc.doctorName || doc.doctorDisplayName || '',
    patientName: doc.patientName || '',
    doctor: {
      _id: doc.doctorId ? String(doc.doctorId) : undefined,
      imageUrl: doc.doctorImageUrl || '',
      location: doc.doctorLocation || '',
      designation: doc.doctorDesignation || '',
      name: doc.doctorName || doc.doctorDisplayName || '',
    },
    patient: {
      _id: doc.patientId ? String(doc.patientId) : undefined,
      fullName: doc.patientName || '',
      email: doc.patientEmail || '',
      phone: doc.patientPhone || '',
    },
    meetLink: doc.meetLink || '',
  };
  return shaped;
}

// ---------------- Email Templates ----------------

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
  meetLink,
}) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
  <div style="font-family: Arial, sans-serif;">
    <div style="background: #0d6efd; color: white; padding: 16px;">
      <h2>New Appointment Request</h2>
    </div>
    <div style="padding: 20px;">
      <p>Hello <b>${doctorName}</b>,</p>
      <p>You have a new appointment request from <b>${patientName}</b>.</p>

      <table style="width:100%; margin-bottom: 16px;">
        <tr><td><b>Service:</b></td><td>${service}</td></tr>
        <tr><td><b>Date:</b></td><td>${formattedDate}</td></tr>
        <tr><td><b>Time Slot:</b></td><td>${timeSlot}</td></tr>
        <tr><td><b>Mode:</b></td><td>${mode === 'video' ? 'Video Consultation' : 'Clinic Visit'}</td></tr>
        ${location ? `<tr><td><b>Location:</b></td><td>${location}</td></tr>` : ''}
        ${insurance ? `<tr><td><b>Insurance:</b></td><td>${insurance}</td></tr>` : ''}
        ${symptoms ? `<tr><td><b>Symptoms:</b></td><td>${symptoms}</td></tr>` : ''}
        ${notes ? `<tr><td><b>Notes:</b></td><td>${notes}</td></tr>` : ''}
      </table>

      ${
        mode === 'video'
          ? `<div style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
              <b>🎥 Google Meet Link:</b><br>
              <a href="${meetLink}" style="color:#0d6efd; font-size: 16px;" target="_blank">
                Join Google Meet
              </a><br>
              <small style="color: #555;">(Click the link above to join the video call)</small>
            </div>`
          : ''
      }

      <p style="margin-top: 24px;">Please log in to your dashboard to accept or decline this appointment.</p>
    </div>
  </div>`;
}


function patientAppointmentRequestTemplate({
  doctorName,
  patientName,
  service,
  date,
  timeSlot,
  mode,
  location,
  insurance,
  meetLink,
}) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
  <div style="font-family: Arial, sans-serif;">
    <div style="background: #0d6efd; color: white; padding: 16px;">
      <h2>Appointment Request Sent ✅</h2>
    </div>
    <div style="padding: 20px;">
      <p>Hello <b>${patientName}</b>,</p>
      <p>Your appointment request has been sent to Dr. <b>${doctorName}</b>.</p>

      <table style="width:100%; margin-bottom: 16px;">
        <tr><td><b>Service:</b></td><td>${service}</td></tr>
        <tr><td><b>Date:</b></td><td>${formattedDate}</td></tr>
        <tr><td><b>Time Slot:</b></td><td>${timeSlot}</td></tr>
        <tr><td><b>Mode:</b></td><td>${mode === 'video' ? 'Video Consultation' : 'Clinic Visit'}</td></tr>
        ${location ? `<tr><td><b>Location:</b></td><td>${location}</td></tr>` : ''}
        ${insurance ? `<tr><td><b>Insurance:</b></td><td>${insurance}</td></tr>` : ''}
      </table>

      ${
        mode === 'video'
          ? `<div style="margin-top: 16px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
              <b>🎥 Google Meet Link:</b><br>
              <a href="${meetLink}" style="color:#0d6efd; font-size: 16px;" target="_blank">
                Join Google Meet
              </a><br>
              <small style="color: #555;">(Click the link above to join the video call)</small>
            </div>`
          : ''
      }

      <p style="margin-top: 24px;">
        You will receive another email once Dr. <b>${doctorName}</b> reviews and accepts your request.
      </p>
    </div>
  </div>`;
}


// ✅ CREATE APPOINTMENT CONTROLLER
async function createAppointment(req, res) {
  try {
    const { doctorId, patientId, date, timeSlot, location, insurance, service, mode, patientEmail, patientPhone, symptoms, notes } = req.body || {};
    if (!doctorId || !patientId || !date || !timeSlot || !service || !mode) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }

    const doctorProfile = await DoctorProfile.findOne({ $or: [{ _id: doctorId }, { user: doctorId }] }).lean();
    if (!doctorProfile) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const patient = await Patient.findById(patientId).lean();
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const docSnapshot = {
      doctorName: doctorProfile.firstName
        ? `${doctorProfile.firstName} ${doctorProfile.lastName}`
        : doctorProfile.displayName,
      doctorDisplayName: doctorProfile.displayName || '',
      doctorDesignation: doctorProfile.designation || '',
      doctorImageUrl: doctorProfile.profileImage?.url || '',
      doctorLocation: doctorProfile.address?.city || '',
    };

    const patSnapshot = {
      patientName: patient.fullName || '',
    };

    let meetLink = '';
    let googleEventId = '';

    // ✅ REAL GOOGLE MEET LINK CREATION
    if (mode === 'video') {
      try {
        const simpleRes = await GoogleMeetService.createEvent({
          doctorName: docSnapshot.doctorName,
          patientName: patSnapshot.patientName,
          service,
          date: parsedDate,
          timeSlot,
          doctorEmail: doctorProfile.email || doctorProfile.doctorEmail,
          patientEmail: patientEmail || patient.email,
          duration: 60,
        });

        if (simpleRes && simpleRes.success && simpleRes.meetLink) {
          meetLink = simpleRes.meetLink;
          googleEventId = simpleRes.eventId;
          // console.log('✅ Google Meet Created:', meetLink);
        } else {
          console.warn('⚠️ Google Meet failed, fallback link generated');
          meetLink = generateMeetLink();
        }
      } catch (err) {
        console.error('❌ Google Meet API Error:', err.message);
        meetLink = generateMeetLink();
      }
    }

    const created = await Appointment.create({
      bookingId: generateId(),
      appointmentId: buildAppointmentId(Date.now()),
      doctorId,
      patientId,
      date: parsedDate,
      timeSlot,
      location,
      insurance: insurance || '',
      service,
      mode,
      meetLink,
      googleEventId,
      status: 'pending',
      cancelled: false,
      isCompleted: false,
      patientEmail: patientEmail || '',
      patientPhone: patientPhone || '',
      symptoms: symptoms || '',
      notes: notes || '',
      ...docSnapshot,
      ...patSnapshot,
    });

    // ✅ Send email notifications
    await sendEmail(
      doctorProfile.email || doctorProfile.doctorEmail,
      `New Appointment Request from ${patSnapshot.patientName}`,
      appointmentEmailTemplate({
        doctorName: docSnapshot.doctorName,
        patientName: patSnapshot.patientName,
        service,
        date: parsedDate,
        timeSlot,
        mode,
        location,
        insurance,
        symptoms,
        notes,
        meetLink,
      })
    );

    await sendEmail(
      patientEmail || patient.email,
      'Appointment Request Received',
      patientAppointmentRequestTemplate({
        doctorName: docSnapshot.doctorName,
        patientName: patSnapshot.patientName,
        service,
        date: parsedDate,
        timeSlot,
        mode,
        location,
        insurance,
        meetLink,
      })
    );

    // ✅ Socket.io notifications
    const shaped = shapeAppointmentForFrontend(created.toObject());
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patientId}`).emit('appointmentCreated', { patientId, appointment: shaped });
      io.to(`doctor_${doctorId}`).emit('appointmentCreated', { doctorId, appointment: shaped });
      io.to('admin').emit('appointmentCreated', { appointment: shaped });
    }

    return res.status(201).json({ success: true, message: 'Appointment created', data: shaped });
  } catch (error) {
    console.error('createAppointment error:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function getMyAppointments(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const items = await Appointment.find({ patientId: userId }).sort({ createdAt: -1 }).lean();
    const list = items.map(shapeAppointmentForFrontend);
    return res.json(toApiResponse(list));
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function getDoctorAppointments(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    // Map doctor auth id -> profile id; include both for backward compatibility
    const profile = await DoctorProfile.findOne({ user: userId }).select({ _id: 1, user: 1 }).lean();
    const doctorIds = [];
    if (profile?._id) doctorIds.push(profile._id);
    // Some legacy records may have stored doctorId as the doctor auth user id
    if (mongoose.isValidObjectId(userId)) doctorIds.push(new mongoose.Types.ObjectId(userId));
    const filter = doctorIds.length ? { doctorId: { $in: doctorIds } } : { doctorId: userId };
    
    // Use aggregation to fetch patient profile images
    const PatientProfile = require('../models/PatientProfile');
    const items = await Appointment.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'patientprofiles',
          localField: 'patientId',
          foreignField: 'user',
          as: 'patientProfile',
          pipeline: [
            { $project: { profileImage: 1, firstName: 1, lastName: 1 } }
          ]
        }
      },
      { $sort: { createdAt: -1 } }
    ]);
    
    const list = items.map(item => {
      const patientProfile = item.patientProfile && item.patientProfile[0] ? item.patientProfile[0] : null;
      const patientImage = patientProfile?.profileImage?.url || '';
      
      return {
        ...shapeAppointmentForFrontend(item),
        patient: {
          ...shapeAppointmentForFrontend(item).patient,
          profileImage: patientImage
        }
      };
    });
    
    return res.json(toApiResponse(list));
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function getAppointmentById(req, res) {
  try {
    const id = req.params.appointmentId || req.params.id;
    const appt = await Appointment.findById(id).lean();
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    return res.json({ success: true, message: 'OK', data: appt });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
// ---------------- Email Templates for Completed & Cancelled ----------------

function appointmentCompletedTemplate(doctorName, patientName, appointment) {
  return `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <div style="background: #28a745; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
      <h2 style="margin: 0;">Appointment Completed ✅</h2>
    </div>
    <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
      <p>Hello <b>${patientName}</b>,</p>
      <p>Your appointment with <b>Dr. ${doctorName}</b> has been marked as <b>completed</b>.</p>
      <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
        <tr><td><b>Service:</b></td><td>${appointment.service}</td></tr>
        <tr><td><b>Date:</b></td><td>${new Date(appointment.date).toLocaleDateString()}</td></tr>
        <tr><td><b>Time Slot:</b></td><td>${appointment.timeSlot}</td></tr>
        <tr><td><b>Mode:</b></td><td>${appointment.mode}</td></tr>
      </table>
      <p>We hope you had a good experience.</p>
    </div>
  </div>`;
}

function appointmentCancelledTemplate(doctorName, patientName, appointment) {
  return `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <div style="background: #dc3545; color: white; padding: 16px; border-radius: 8px 8px 0 0;">
      <h2 style="margin: 0;">Appointment Cancelled ❌</h2>
    </div>
    <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
      <p>Hello <b>${patientName}</b>,</p>
      <p>We regret to inform you that your appointment with <b>Dr. ${doctorName}</b> has been <b>cancelled</b>.</p>
      <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
        <tr><td><b>Service:</b></td><td>${appointment.service}</td></tr>
        <tr><td><b>Date:</b></td><td>${new Date(appointment.date).toLocaleDateString()}</td></tr>
        <tr><td><b>Time Slot:</b></td><td>${appointment.timeSlot}</td></tr>
        <tr><td><b>Mode:</b></td><td>${appointment.mode}</td></tr>
      </table>
      <p>Please contact the clinic if you wish to reschedule.</p>
    </div>
  </div>`;
}


async function updateAppointmentStatus(req, res) {
  try {
    const id = req.params.appointmentId || req.params.id;
    const { status } = req.body || {};
    const allowed = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const appt = await Appointment.findById(id);
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    appt.status = status;
    appt.isCompleted = status === 'completed';
    appt.cancelled = status === 'cancelled';
    await appt.save();
    // --- Added: send patient email on status change ---
const doctorName = appt.doctorName || appt.doctorDisplayName || 'Doctor';
const patientName = appt.patientName || 'Patient';
if (status === 'completed' && appt.patientEmail) {
  const html = appointmentCompletedTemplate(doctorName, patientName, appt);
  await sendEmail(appt.patientEmail, 'Your Appointment Has Been Completed', html);
} else if (status === 'cancelled' && appt.patientEmail) {
  const html = appointmentCancelledTemplate(doctorName, patientName, appt);
  await sendEmail(appt.patientEmail, 'Your Appointment Has Been Cancelled', html);
}

    const shaped = shapeAppointmentForFrontend(appt.toObject());
    const io = req.app.get('io');
    if (io) io.emit('appointmentUpdated', { appointmentId: shaped._id, appointment: shaped });
    return res.json({ success: true, message: 'Status updated', data: shaped });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function cancelAppointment(req, res) {
  try {
    const id = req.params.appointmentId || req.params.id;
    const appt = await Appointment.findById(id);
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    appt.status = 'cancelled';
    appt.cancelled = true;
    await appt.save();
    // --- Added: send patient email when appointment is cancelled ---
const doctorName = appt.doctorName || appt.doctorDisplayName || 'Doctor';
const patientName = appt.patientName || 'Patient';
if (appt.patientEmail) {
  const html = appointmentCancelledTemplate(doctorName, patientName, appt);
  await sendEmail(appt.patientEmail, 'Your Appointment Has Been Cancelled', html);
}

    const shaped = shapeAppointmentForFrontend(appt.toObject());
    const io = req.app.get('io');
    if (io) io.emit('appointmentCancelled', { appointmentId: shaped._id, appointment: shaped });
    return res.json({ success: true, message: 'Appointment cancelled', data: shaped });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

module.exports = {
  createAppointment,
  getMyAppointments,
  getDoctorAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
};


