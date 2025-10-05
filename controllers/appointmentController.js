const { sendEmail } = require('../utils/nodeMailer');

const { randomUUID } = require('crypto');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const Patient = require('../models/Patient');
const mongoose = require('mongoose');


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
  };
  return shaped;
}


// templates/appointmentEmailTemplate.js

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

function patientAppointmentRequestTemplate({
  doctorName,
  patientName,
  service,
  date,
  timeSlot,
  mode,
  location,
  insurance,
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
      <h2 style="margin: 0;">Appointment Request Sent ✅</h2>
    </div>

    <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
      <p>Hello <b>${patientName}</b>,</p>
      <p>Your appointment request has been successfully <b>sent</b> to Dr. <b>${doctorName}</b>.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td><b>Doctor:</b></td><td>Dr. ${doctorName}</td></tr>
        <tr><td><b>Service:</b></td><td>${service}</td></tr>
        <tr><td><b>Date:</b></td><td>${formattedDate}</td></tr>
        <tr><td><b>Time Slot:</b></td><td>${timeSlot}</td></tr>
        <tr><td><b>Mode:</b></td><td>${mode === 'video' ? 'Video Consultation' : 'Clinic Visit'}</td></tr>
        ${location ? `<tr><td><b>Location:</b></td><td>${location}</td></tr>` : ''}
        ${insurance ? `<tr><td><b>Insurance:</b></td><td>${insurance}</td></tr>` : ''}
      </table>

      <p style="margin-top: 24px;">
        You will receive another email once Dr. <b>${doctorName}</b> reviews and accepts your request.
      </p>

      <p style="color: #888; font-size: 13px;">
        This is an automated message. Please do not reply.
      </p>
    </div>
  </div>
  `;
}










async function createAppointment(req, res) {
  try {
    const { doctorId, patientId, date, timeSlot, location, insurance, service, mode, patientEmail, patientPhone, symptoms, notes } = req.body || {};
    if (!doctorId || !patientId || !date || !timeSlot || !service || !mode) {
      return res.status(400).json({ success: false, message: 'Missing required fields: doctorId, patientId, date, timeSlot, service, mode are required' });
    }

    if (typeof timeSlot !== 'string' || !timeSlot.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid timeSlot' });
    }
    if (typeof service !== 'string' || !service.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid service' });
    }
    if (!['video', 'clinic'].includes(String(mode))) {
      return res.status(400).json({ success: false, message: 'Invalid mode. Allowed: video, clinic' });
    }

    // Validate date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date' });
    }

    let doctorProfile = null;
    if (!mongoose.isValidObjectId(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor id' });
    }
    // doctorId from FE is DoctorProfile._id; resolve profile
    doctorProfile = await DoctorProfile.findOne({ $or: [{ _id: doctorId }, { user: doctorId }] }).lean();
    if (!doctorProfile) {
      return res.status(400).json({ success: false, message: 'Doctor not found' });
    }

    // Check if doctor is blocked
    if (doctorProfile.isBlocked) {
      return res.status(403).json({ success: false, message: 'This doctor is currently unavailable for appointments' });
    }

    if (!mongoose.isValidObjectId(patientId)) {
      return res.status(400).json({ success: false, message: 'Invalid patient id' });
    }
    const patient = await Patient.findById(patientId).lean();
    if (!patient) {
      return res.status(400).json({ success: false, message: 'Patient not found' });
    }

    const docSnapshot = {
      doctorName: doctorProfile?.firstName && doctorProfile?.lastName
        ? `${doctorProfile.firstName} ${doctorProfile.lastName}`
        : (doctorProfile?.displayName || ''),
      doctorDisplayName: doctorProfile?.displayName || '',
      doctorDesignation: doctorProfile?.designation || '',
      doctorImageUrl: doctorProfile?.profileImage?.url || '',
      doctorLocation: doctorProfile?.address?.city || '',
    };

    const patSnapshot = {
      patientName: patient?.fullName || '',
      patientProfileImage: '',
    };

    // Store DoctorProfile _id as canonical doctor identifier for appointments
    const resolvedDoctorId = doctorProfile._id;

    const created = await Appointment.create({
      bookingId: generateId(),
      appointmentId: buildAppointmentId(Date.now()),
      doctorId: resolvedDoctorId,
      patientId,
      date: parsedDate,
      timeSlot,
      location,
      insurance: insurance || '',
      service,
      mode,
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

    const html = appointmentEmailTemplate({
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
    });

    const patientConfirmationHtml = patientAppointmentRequestTemplate({
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
    });
    // console.log("Sending email to:", doctorProfile.email || doctorProfile.doctorEmail); // ensure correct field
    // console.log("Email content:", html);

    await sendEmail(
      doctorProfile.email || doctorProfile.doctorEmail, // ensure correct field
      `New Appointment Request from ${patSnapshot.patientName}`,
      html
    );
console.log("patientEmail:", patientEmail ,patient.email);
    // send email to patient as confirmation
    await sendEmail(
      patientEmail || patient.email,
      'Appointment Request Received',
      patientConfirmationHtml
    );

    const shaped = shapeAppointmentForFrontend(created.toObject());

    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patientId}`).emit('appointmentCreated', { patientId: String(patientId), appointment: shaped });
      io.to(`doctor_${resolvedDoctorId}`).emit('appointmentCreated', { doctorId: String(resolvedDoctorId), appointment: shaped });
      // Also notify doctor by their auth user id room if client joins that
      if (doctorProfile?.user) {
        io.to(`doctorUser_${String(doctorProfile.user)}`).emit('appointmentCreated', { doctorUserId: String(doctorProfile.user), appointment: shaped });
      }
      // Broadcast to admin dashboards
      io.to('admin').emit('appointmentCreated', { appointment: shaped });
    }

    return res.status(201).json({ success: true, message: 'Appointment created', data: shaped });
  } catch (error) {
    console.error('createAppointment error:', error && (error.stack || error));
    if (error && error.name === 'ValidationError') {
      const errors = Object.values(error.errors || {}).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    if (error && error.name === 'CastError') {
      return res.status(400).json({ success: false, message: `Invalid value for field: ${error.path}` });
    }
    if (error && (error.code === 11000 || error.code === 11001)) {
      return res.status(409).json({ success: false, message: 'Duplicate key error', key: error.keyValue });
    }
    return res.status(500).json({ success: false, message: error?.message || 'Internal server error' });
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


