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


