const mongoose = require('mongoose');
const streamifier = require('streamifier');
const DoctorProfile = require('../models/DoctorProfile');
const LandingDoctor = require('../models/Doctor');
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

async function syncLandingDoctorFromProfile(profileDoc) {
  try {
    const name = profileDoc.displayName || [profileDoc.firstName, profileDoc.lastName].filter(Boolean).join(' ').trim() || 'Doctor';
    const imageUrl = profileDoc.profileImage?.url || '';
    const location = [profileDoc.address?.city, profileDoc.address?.country].filter(Boolean).join(', ');
    const specialty = profileDoc.designation || 'General';
    const available = profileDoc.availability === 'available';
    const experienceYears = (() => {
      const m = /([0-9]+)\+?\s*years?/i.exec(profileDoc.experience || '');
      return m ? parseInt(m[1], 10) : 0;
    })();

    await LandingDoctor.findOneAndUpdate(
      { user: profileDoc.user },
      {
        $set: {
          user: profileDoc.user,
          name,
          specialty,
          rating: 0,
          location,
          imageUrl: imageUrl || 'https://res.cloudinary.com/demo/image/upload/v1699999999/placeholder.png',
          available,
          duration: 30,
          featured: false,
          description: profileDoc.aboutMe || '',
          experience: experienceYears,
          consultationFee: 0,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (e) {
    // Do not fail the main request if syncing fails
  }
}

// GET /api/doctors
exports.listDoctors = async (req, res) => {
  try {
    const { q = '', city, specialty, page = 1, limit = 12, sort } = req.query;
    const filter = {};
    if (q) filter.$text = { $search: q };
    if (city) filter['address.city'] = { $regex: new RegExp(`^${city}$`, 'i') };
    if (specialty) filter.designation = { $regex: new RegExp(specialty, 'i') };

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
    const doc = await DoctorProfile.findById(id).lean();
    if (!doc) return res.status(404).json({ message: 'Doctor not found' });
    return res.json({ success: true, doctor: doc });
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
    // Sync landing doctor card
    await syncLandingDoctorFromProfile(doc);
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
        await syncLandingDoctorFromProfile(doc);
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

    await syncLandingDoctorFromProfile(doc);
    return res.json({ success: true, doctor: doc });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update availability' });
  }
};


