require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Skill = require('../models/Skill');
const { seedSkills } = require('./skills');

/**
 * Test database connection and seed verification script
 */
const testDatabase = async () => {
  console.log('--- PHOENIX Database & Mongoose Test ---');
  console.log(`Target MONGO_URI: ${process.env.MONGO_URI || '(undefined)'}`);

  try {
    // 1. Connect to MongoDB
    console.log('\n[1/4] Establishing database connection...');
    await connectDB();

    // 2. Run seed skills (idempotent upsert)
    console.log('\n[2/4] Verifying/Updating seed skills...');
    const count = await seedSkills();

    // 3. Print verified skill count & sample
    console.log('\n[3/4] Fetching skills summary...');
    const categories = await Skill.distinct('category');
    console.log(`[Summary] Total skills verified: ${count}`);
    console.log(`[Summary] Distinct categories: ${categories.join(', ')}`);

    // 4. Disconnect cleanly
    console.log('\n[4/4] Disconnecting from database...');
    await mongoose.disconnect();
    console.log('[Success] Disconnected cleanly. Database test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n[Database Test Failed]:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

testDatabase();
