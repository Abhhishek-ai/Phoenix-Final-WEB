require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

const adminConfigs = [
  {
    name: 'PHOENIX Chief Admin',
    email: process.env.ADMIN1_EMAIL || 'admin1@mbm.ac.in',
    password: process.env.ADMIN1_PASSWORD || 'AdminPass123!'
  },
  {
    name: 'MBM Club Coordinator',
    email: process.env.ADMIN2_EMAIL || 'admin2@mbm.ac.in',
    password: process.env.ADMIN2_PASSWORD || 'AdminPass123!'
  },
  {
    name: 'MBM Technical Lead',
    email: process.env.ADMIN3_EMAIL || 'admin3@mbm.ac.in',
    password: process.env.ADMIN3_PASSWORD || 'AdminPass123!'
  }
];

/**
 * Seed Admin accounts into MongoDB idempotently
 */
const seedAdmins = async () => {
  try {
    await connectDB();
    console.log('[Admin Seed] Seeding administrator accounts...');

    for (const config of adminConfigs) {
      const normalizedEmail = config.email.toLowerCase().trim();
      const existingAdmin = await User.findOne({ email: normalizedEmail });

      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(config.password, salt);

      if (existingAdmin) {
        // Ensure role is ADMIN and status is ACTIVE
        existingAdmin.role = 'ADMIN';
        existingAdmin.status = 'ACTIVE';
        existingAdmin.passwordHash = passwordHash;
        await existingAdmin.save();
        console.log(`[Admin Seed] Updated existing admin account: ${normalizedEmail}`);
      } else {
        await User.create({
          name: config.name,
          email: normalizedEmail,
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE'
        });
        console.log(`[Admin Seed] Created new admin account: ${normalizedEmail}`);
      }
    }

    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    console.log(`[Admin Seed] Success: ${adminCount} administrator account(s) ready in database.`);
    return adminCount;
  } catch (error) {
    console.error(`[Admin Seed Error] Failed to seed administrators: ${error.message}`);
    throw error;
  }
};

// Run directly when executed via node seed/admins.js
if (require.main === module) {
  seedAdmins()
    .then(() => {
      console.log('[Admin Seed] Disconnecting cleanly from MongoDB...');
      return mongoose.disconnect();
    })
    .then(() => {
      console.log('[Admin Seed] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Admin Seed] Process failed:', err.message);
      mongoose.disconnect().finally(() => process.exit(1));
    });
}

module.exports = { seedAdmins };
