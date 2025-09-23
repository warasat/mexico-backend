const mongoose = require('mongoose');

const { Schema } = mongoose;

const AppointmentSchema = new Schema(
  {
    appointmentId: { type: String, unique: true, sparse: true, index: true },
    bookingId: { type: String, unique: true, sparse: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'DoctorProfile', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },

    date: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    location: { type: String, default: '' },
    insurance: { type: String, default: '' },
    service: { type: String, required: true },
    mode: { type: String, enum: ['video', 'clinic'], required: true },

    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
    cancelled: { type: Boolean, default: false },
    isCompleted: { type: Boolean, default: false },

    patientEmail: { type: String, default: '' },
    patientPhone: { type: String, default: '' },
    symptoms: { type: String, default: '' },
    notes: { type: String, default: '' },

    // Snapshots for faster UI rendering
    doctorName: { type: String, default: '' },
    doctorDisplayName: { type: String, default: '' },
    doctorDesignation: { type: String, default: '' },
    doctorImageUrl: { type: String, default: '' },
    doctorLocation: { type: String, default: '' },

    patientName: { type: String, default: '' },
    patientProfileImage: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', AppointmentSchema);


