/*
  One-time migration: Merge legacy models/Doctor into DoctorProfile without changing schemas.
  - Reads all docs from 'doctors' collection (no Doctor model import required)
  - For each Doctor, finds DoctorProfile by user
  - Updates safe, matching fields on DoctorProfile (displayName/designation/address/profileImage/availability/experience)
  - Does NOT modify DoctorProfile schema
  - Logs summary
*/

/* eslint-disable no-console */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('../config/db');
const DoctorProfile = require('../models/DoctorProfile');

function toDisplayName(doctor) {
  return doctor.name || '';
}

function toDesignation(doctor) {
  return doctor.specialty || '';
}

function toAddress(doctor) {
  // Legacy location is a single string like "City, ST"; store in city when possible
  const loc = doctor.location || '';
  const parts = loc.split(',').map(s => s.trim()).filter(Boolean);
  const city = parts[0] || loc;
  return { address: '', city, state: parts[1] || '', country: '', pincode: '' };
}

function toProfileImage(doctor) {
  const url = doctor.imageUrl || '';
  return { url, public_id: '' };
}

function toAvailability(doctor) {
  return doctor.available ? 'available' : 'unavailable';
}

function toExperienceString(doctor) {
  // Keep DoctorProfile format (string). If number, turn into "X years".
  if (typeof doctor.experience === 'number') return `${doctor.experience} years`;
  return doctor.experience || '';
}

async function main() {
  await connectDB();
  console.log('Connected');

  try {
    const doctorsCol = mongoose.connection.collection('doctors');
    const doctors = await doctorsCol.find({}).toArray();
    let updated = 0;
    let skipped = 0;

    for (const d of doctors) {
      // Find profile by user reference (legacy Doctor has user field)
      const userId = d.user;
      if (!userId) {
        skipped += 1;
        continue;
      }

      const profile = await DoctorProfile.findOne({ user: userId }).lean();
      if (!profile) {
        // Create minimal profile without altering schema
        await DoctorProfile.create({
          user: userId,
          displayName: toDisplayName(d),
          designation: toDesignation(d),
          address: toAddress(d),
          profileImage: toProfileImage(d),
          availability: toAvailability(d),
          experience: toExperienceString(d),
        });
        updated += 1;
        continue;
      }

      const set = {};
      if (!profile.displayName && d.name) set.displayName = toDisplayName(d);
      if (!profile.designation && d.specialty) set.designation = toDesignation(d);
      if ((!profile.address || (!profile.address.city && d.location)) ) set.address = toAddress(d);
      if ((!profile.profileImage || !profile.profileImage.url) && d.imageUrl) set.profileImage = toProfileImage(d);
      if (!profile.availability && typeof d.available === 'boolean') set.availability = toAvailability(d);
      if (!profile.experience && (d.experience || d.experience === 0)) set.experience = toExperienceString(d);

      if (Object.keys(set).length) {
        await DoctorProfile.updateOne({ _id: profile._id }, { $set: set });
        updated += 1;
      } else {
        skipped += 1;
      }
    }

    console.log(`Migration complete. Updated/created: ${updated}, skipped: ${skipped}`);
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected');
  }
}

if (require.main === module) {
  main();
}

module.exports = main;


