/**
 * Seed script — creates the first admin user.
 * Usage:
 *   node scripts/seed.js
 *   ADMIN_EMAIL=you@example.com ADMIN_PASS=secret node scripts/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Vendor = require('../src/models/Vendor');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mahattaart.com';
const ADMIN_PASS  = process.env.ADMIN_PASS  || 'Admin@1234';
const ADMIN_NAME  = process.env.ADMIN_NAME  || 'Kunal';

// Vikas vendor seed data
const VIKAS_VENDOR = {
  name: 'Vikas Productions',
  contactPerson: 'Vikas',
  email: 'vikas@mahattaart.com',
  supplyCategories: ['Paper', 'Canvas', 'Frame', 'Glass', 'Mount', 'Moulding'],
  paymentTerms: 'Net 30',
  isActive: true,
};

const VIKAS_USER = {
  name: 'Vikas',
  email: 'vikas@mahattaart.com',
  password: process.env.VIKAS_PASS || 'Vikas@1234',
  role: 'vendor',
};

// Developer/team users (selectable in the Tasks "Developers" multi-select).
const TEAM_USERS = [
  {
    name: 'Abhishek',
    email: (process.env.ABHISHEK_EMAIL || 'abhishek@mahattaart.com').toLowerCase(),
    password: process.env.ABHISHEK_PASS || 'Abhishek@1234',
    role: 'warehouse',
  },
  {
    name: 'Faiz',
    email: (process.env.FAIZ_EMAIL || 'faiz@mahattaart.com').toLowerCase(),
    password: process.env.FAIZ_PASS || 'Faiz@1234',
    role: 'warehouse',
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // ── Admin user ──
  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
  if (existingAdmin) {
    if (existingAdmin.name !== ADMIN_NAME) {
      // updateOne avoids the password-required validation that .save() runs.
      await User.updateOne({ _id: existingAdmin._id }, { $set: { name: ADMIN_NAME } });
      console.log(`Admin name updated: ${existingAdmin.name} → ${ADMIN_NAME} (${ADMIN_EMAIL})`);
    } else {
      console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    }
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASS, role: 'admin' });
    console.log(`Admin created: ${ADMIN_EMAIL} / ${ADMIN_PASS}`);
  }

  // ── Vikas vendor profile + user ──
  let vikasVendor = await Vendor.findOne({ email: VIKAS_VENDOR.email });
  if (!vikasVendor) {
    vikasVendor = await Vendor.create(VIKAS_VENDOR);
    console.log(`Vendor created: ${vikasVendor.name} (${vikasVendor._id})`);
  } else {
    console.log(`Vendor already exists: ${vikasVendor.name}`);
  }

  const existingVikas = await User.findOne({ email: VIKAS_USER.email });
  if (existingVikas) {
    console.log(`Vikas user already exists: ${VIKAS_USER.email}`);
  } else {
    const vikasUser = await User.create({ ...VIKAS_USER, vendorId: vikasVendor._id });
    vikasVendor.userId = vikasUser._id;
    await vikasVendor.save();
    console.log(`Vikas user created: ${VIKAS_USER.email} / ${VIKAS_USER.password}`);
  }

  // ── Team / developer users ──
  for (const u of TEAM_USERS) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log(`${u.name} user already exists: ${u.email}`);
    } else {
      await User.create(u);
      console.log(`${u.name} user created: ${u.email} / ${u.password}`);
    }
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
