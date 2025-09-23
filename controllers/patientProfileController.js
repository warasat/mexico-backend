const streamifier = require('streamifier');
const PatientProfile = require('../models/PatientProfile');
const Patient = require('../models/Patient');
const cloudinary = require('../utils/cloudinary');

// GET /api/patients/me (profile)
exports.getMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const patient = await Patient.findById(userId).lean();
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    let profile = await PatientProfile.findOne({ user: userId }).lean();
    if (!profile) {
      // Initialize an empty profile from auth data (for first visit)
      profile = await PatientProfile.create({
        user: userId,
        firstName: patient.fullName?.split(' ')[0] || '',
        lastName: patient.fullName?.split(' ').slice(1).join(' ') || '',
        phone: patient.phone || '',
        email: patient.email || '',
      });
      profile = profile.toObject();
    }
    return res.json({ success: true, profile });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

// PUT /api/patients/me (upsert profile)
exports.updateMe = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const payload = { ...req.body };

    const allowed = [
      'firstName',
      'lastName',
      'dateOfBirth',
      'gender',
      'phone',
      'email',
      'bloodGroup',
      'addressLine',
      'city',
      'state',
      'country',
      'pincode',
    ];
    const update = { user: userId };
    for (const key of allowed) if (key in payload) update[key] = payload[key];

    const profile = await PatientProfile.findOneAndUpdate(
      { user: userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();
    return res.json({ success: true, profile });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update profile' });
  }
};

// POST /api/patients/me/upload-image
exports.uploadImage = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'patient_profiles' },
      async (error, result) => {
        if (error) return res.status(500).json({ message: 'Cloud upload failed' });
        const profileImage = { url: result.secure_url, public_id: result.public_id };
        const profile = await PatientProfile.findOneAndUpdate(
          { user: userId },
          { $set: { profileImage, user: userId } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();
        return res.json({ success: true, profile });
      }
    );
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to upload image' });
  }
};


