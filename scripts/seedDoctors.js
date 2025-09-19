const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = require('../config/db');
const User = require('../models/User');
const DoctorAuth = require('../models/DoctorAuth');
const DoctorProfile = require('../models/DoctorProfile');

const cities = [
  'Puerto Vallarta', 'Mexico City', 'Playa del Carmen', 'Lake Chapala', 'San Miguel de Allende', 'Guadalajara'
];

const specializations = [
  'Dentist', 'Cardiologist', 'Dermatologist', 'Pediatrician', 'Orthopedic Surgeon (Orthopedist)',
  'Psychologist', 'Psychiatrist', 'Primary Care Physician (PCP)', 'Chiropractor', 'Optometrist',
];

const qualifications = ['MBBS', 'MD', 'BDS', 'MDS', 'DO', 'PhD', 'DDS', 'MS'];

const firstNames = ['Carlos', 'María', 'José', 'Ana', 'Luis', 'Laura', 'Jorge', 'Sofía', 'Miguel', 'Lucía', 'Fernando', 'Elena', 'Ricardo', 'Patricia', 'Alejandro'];
const lastNames = ['García', 'Hernández', 'Martínez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores', 'Torres', 'Rivera', 'Díaz', 'Vargas', 'Castro'];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildDoctor(i) {
  const firstName = rand(firstNames);
  const lastName = rand(lastNames);
  const fullName = `${firstName} ${lastName}`;
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');
  const email = `${norm(firstName)}.${norm(lastName)}.${i}@example.mx`;
  const password = `Passw0rd!${100 + i}`;
  const qualification = `${rand(qualifications)}, ${rand(qualifications)}`;
  const designation = rand(specializations);
  // Assign cities in order to ensure each doctor gets a unique city
  const city = cities[(i - 1) % cities.length];
  const address = `${Math.floor(Math.random() * 900 + 100)} Calle ${lastName}, ${city}`;
  const phone = `+52 ${Math.floor(1000000000 + Math.random() * 900000000)}`;
  const about = `Especialista en ${designation.toLowerCase()} con enfoque en atención humana y resultados.`;
  return { firstName, lastName, fullName, email, password, qualification, designation, city, address, phone, about };
}

async function upsertDoctor(d, credentials) {
  // Create or find User
  const user = await User.findOneAndUpdate(
    { email: d.email },
    { $set: { name: d.fullName, email: d.email } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Create DoctorAuth (hash handled by pre-save)
  let auth = await DoctorAuth.findOne({ email: d.email });
  if (!auth) {
    auth = new DoctorAuth({ fullName: d.fullName, email: d.email, phone: d.phone, password: d.password });
    await auth.save();
  }

  // Create/Update DoctorProfile
  await DoctorProfile.findOneAndUpdate(
    { user: user._id },
    {
      $set: {
        user: user._id,
        firstName: d.firstName,
        lastName: d.lastName,
        displayName: d.fullName,
        designation: d.designation,
        phones: [d.phone],
        email: d.email,
        address: { address: d.address, city: d.city, state: '', country: 'Mexico', pincode: '' },
        experience: `${Math.floor(Math.random() * 21) + 5} years`,
        aboutMe: d.about,
        knownLanguages: ['Spanish', 'English'],
        specialtyRank: Math.floor(Math.random() * 5) + 1,
        availability: Math.random() > 0.3 ? 'available' : 'unavailable',
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  credentials.push({ email: d.email, password: d.password });
}

async function main() {
  await connectDB();
  try {
    const credentials = [];
    // Clear existing doctors/profiles if needed
    await DoctorProfile.deleteMany({});
    await DoctorAuth.deleteMany({});

    const docs = Array.from({ length: 15 }).map((_, i) => buildDoctor(i + 1));
    for (const d of docs) {
      // eslint-disable-next-line no-await-in-loop
      await upsertDoctor(d, credentials);
    }

    const outPath = path.resolve(__dirname, 'doctors_credentials.json');
    fs.writeFileSync(outPath, JSON.stringify(credentials, null, 2));
    console.log(`Seeded ${docs.length} doctors.`);
    console.log(`Credentials saved to ${outPath}`);
  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.connection.close();
  }
}

main();


