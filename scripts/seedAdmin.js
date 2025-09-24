/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('../config/db');
const Admin = require('../models/Admin');

async function main() {
  await connectDB();
  try {
    const email = 'admin@example.com';
    const password = 'Admin@123';
    const passwordHash = await bcrypt.hash(password, 10);
    await Admin.findOneAndUpdate(
      { email },
      { $set: { email, passwordHash, role: 'admin' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Admin seeded:', email);
  } catch (e) {
    console.error('Failed to seed admin:', e);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) main();

module.exports = main;


