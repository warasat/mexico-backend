const mongoose = require('mongoose');

const { Schema } = mongoose;

const ProfileImageSchema = new Schema(
  {
    url: { type: String, default: '' },
    public_id: { type: String, default: '' },
  },
  { _id: false }
);

const AddressSchema = new Schema(
  {
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    pincode: { type: String, default: '' },
  },
  { _id: false }
);


const DoctorProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    profileImage: { type: ProfileImageSchema, default: () => ({}) },

    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    displayName: { type: String, default: '' },
    designation: { type: String, default: '' },

    phones: [{ type: String }],
    email: { type: String, default: '' },

    address: { type: AddressSchema, default: () => ({}) },

    experience: { type: String, default: '' },
    insurances: [{ type: String }],

    servicesOffered: [{ type: String }],

    aboutMe: { type: String, default: '' },
    knownLanguages: [{ type: String }],

    specialtyRank: { type: Number, default: 0 },

    availability: { type: String, enum: ['available', 'unavailable'], default: 'unavailable' },
    availabilityUpdatedAt: { type: Date },
  },
  { timestamps: true }
);

DoctorProfileSchema.index({
  firstName: 'text',
  lastName: 'text',
  displayName: 'text',
  aboutMe: 'text',
  servicesOffered: 'text',
});

module.exports = mongoose.model('DoctorProfile', DoctorProfileSchema);


