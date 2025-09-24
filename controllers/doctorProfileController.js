const mongoose = require('mongoose');
const streamifier = require('streamifier');
const DoctorProfile = require('../models/DoctorProfile');
const cloudinary = require('../utils/cloudinary');

function publicDoctorProjection() {
  return {
    _id: 1,
    displayName: 1,
    firstName: 1,
    lastName: 1,
    designation: 1,
    profileImage: 1,
    'address.city': 1,
    'address.country': 1,
    experience: 1,
    knownLanguages: 1,
    servicesOffered: 1,
    insurances: 1,
    specialtyRank: 1,
    availability: 1,
    isBlocked: 1, // Include blocking status
  };
}

function toCard(doc) {
  const name = doc.displayName || [doc.firstName, doc.lastName].filter(Boolean).join(' ').trim();
  const location = [doc.address?.city, doc.address?.country].filter(Boolean).join(', ');
  // Use the experience field as provided
  const experienceDisplay = doc.experience || '';

  return {
    id: String(doc._id),
    displayName: name,
    designation: doc.designation || '',
    image: doc.profileImage?.url || '',
    location,
    experience: experienceDisplay,
    knownLanguages: Array.isArray(doc.knownLanguages) ? doc.knownLanguages : [],
    servicesOffered: Array.isArray(doc.servicesOffered) ? doc.servicesOffered : [],
    insurances: doc.insurances || [],
    specialtyRank: doc.specialtyRank || 0,
    availability: doc.availability || 'unavailable',
  };
}

// Removed legacy sync to Doctor model

// GET /api/doctors
exports.listDoctors = async (req, res) => {
  try {
    const { q = '', city, specialty, page = 1, limit = 12, sort } = req.query;
    const filter = {};
    if (q) filter.$text = { $search: q };
    if (city) filter['address.city'] = { $regex: new RegExp(`^${city}$`, 'i') };
    if (specialty) filter.designation = { $regex: new RegExp(specialty, 'i') };
    
    // Filter out blocked doctors from public listings
    filter.isBlocked = { $ne: true };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);
    const sortOption = sort === 'rank' ? { specialtyRank: -1 } : sort === 'name' ? { displayName: 1, firstName: 1 } : { createdAt: -1 };

    const [items, total] = await Promise.all([
      DoctorProfile.find(filter, publicDoctorProjection()).sort(sortOption).skip((pageNum - 1) * pageSize).limit(pageSize).exec(),
      DoctorProfile.countDocuments(filter),
    ]);

    const results = items.map(toCard);
    return res.json({ success: true, page: pageNum, limit: pageSize, total, results });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to list doctors' });
  }
};

// GET /api/doctors/:id
exports.getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid doctor id' });

    const profile = await DoctorProfile.findById(id).lean();
    if (!profile) return res.status(404).json({ message: 'Doctor not found' });

    // Check if doctor is blocked
    if (profile.isBlocked) {
      return res.status(403).json({ message: 'This doctor is currently unavailable for appointments' });
    }

    // Review enrichment skipped (legacy Doctor model removed)
    const reviews = [];

    return res.json({ success: true, doctor: profile, reviews });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch doctor' });
  }
};

// GET /api/doctors/me
exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const doc = await DoctorProfile.findOne({ user: userId }).lean();
    return res.json({ success: true, doctor: doc || null });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// PUT /api/doctors/me (upsert)
exports.updateMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const payload = { ...req.body };


    const errors = {};
    if (payload.email && typeof payload.email !== 'string') errors.email = 'email must be string';
    if (Object.keys(errors).length) return res.status(400).json({ message: 'Validation error', errors });

    const doc = await DoctorProfile.findOneAndUpdate(
      { user: userId },
      { $set: { ...payload, user: userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return res.json({ success: true, doctor: doc });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update profile' });
  }
};

// POST /api/doctors/me/upload-image
exports.uploadImage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'doctor_profiles' },
      async (error, result) => {
        if (error) return res.status(500).json({ message: 'Cloud upload failed' });
        const profileImage = { url: result.secure_url, public_id: result.public_id };
        const doc = await DoctorProfile.findOneAndUpdate(
          { user: userId },
          { $set: { profileImage, user: userId } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();
        return res.json({ success: true, doctor: doc });
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to upload image' });
  }
};

// PATCH /api/doctors/me/availability
exports.updateAvailability = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const { availability } = req.body || {};
    if (!['available', 'unavailable'].includes(availability)) {
      return res.status(400).json({ message: "availability must be 'available' or 'unavailable'" });
    }
    const doc = await DoctorProfile.findOneAndUpdate(
      { user: userId },
      { $set: { availability, availabilityUpdatedAt: new Date(), user: userId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    const io = req.app.get('io');
    if (io) io.emit('doctorAvailabilityUpdate', { doctorId: String(doc._id), availability: doc.availability });

    return res.json({ success: true, doctor: doc });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update availability' });
  }
};

// GET /api/doctor/availability/:doctorId
exports.getAvailabilityByDoctorId = async (req, res) => {
  try {
    const { doctorId } = req.params;
    if (!mongoose.isValidObjectId(doctorId)) return res.status(400).json({ message: 'Invalid doctor id' });
    let doc = await DoctorProfile.findById(doctorId).select({ weeklyAvailability: 1 }).lean();
    if (!doc) doc = await DoctorProfile.findOne({ user: doctorId }).select({ weeklyAvailability: 1 }).lean();

    const emptyDay = { morning: [], afternoon: [], evening: [] };
    const defaultWeek = {
      monday: { ...emptyDay },
      tuesday: { ...emptyDay },
      wednesday: { ...emptyDay },
      thursday: { ...emptyDay },
      friday: { ...emptyDay },
      saturday: { ...emptyDay },
      sunday: { ...emptyDay },
    };
    return res.json({ success: true, weeklyAvailability: doc?.weeklyAvailability || defaultWeek });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch availability' });
  }
};

// POST /api/doctor/availability (auth)
exports.saveAvailabilityForMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const payload = req.body?.weeklyAvailability || req.body || {};
    const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const normalized = {};
    for (const d of days) {
      const v = payload[d] || {};
      normalized[d] = {
        morning: Array.isArray(v.morning) ? v.morning : [],
        afternoon: Array.isArray(v.afternoon) ? v.afternoon : [],
        evening: Array.isArray(v.evening) ? v.evening : [],
      };
    }
    const doc = await DoctorProfile.findOneAndUpdate(
      { user: userId },
      { $set: { weeklyAvailability: normalized } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return res.json({ success: true, weeklyAvailability: doc.weeklyAvailability });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to save availability' });
  }
};


