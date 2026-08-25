require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Skill = require('../models/Skill');

const initialSkills = [
  // WEB DEVELOPMENT
  { name: 'HTML', category: 'WEB_DEVELOPMENT', description: 'Semantic HTML5 markup and web structure' },
  { name: 'CSS', category: 'WEB_DEVELOPMENT', description: 'Modern CSS3, Flexbox, Grid, and responsive design' },
  { name: 'JavaScript', category: 'WEB_DEVELOPMENT', description: 'Modern ECMAScript (ES6+), DOM manipulation, and asynchronous programming' },
  { name: 'React', category: 'WEB_DEVELOPMENT', description: 'Component-based frontend architecture with React.js' },
  { name: 'Node.js', category: 'WEB_DEVELOPMENT', description: 'Server-side JavaScript runtime environment' },
  { name: 'Express.js', category: 'WEB_DEVELOPMENT', description: 'Web application and RESTful API framework for Node.js' },
  { name: 'MongoDB', category: 'WEB_DEVELOPMENT', description: 'NoSQL document database design and aggregation' },
  { name: 'MySQL', category: 'WEB_DEVELOPMENT', description: 'Relational database management, querying, and schema design' },
  { name: 'PHP', category: 'WEB_DEVELOPMENT', description: 'Server-side web scripting and backend development' },

  // APP DEVELOPMENT
  { name: 'Flutter', category: 'APP_DEVELOPMENT', description: 'Cross-platform mobile application development with Dart' },
  { name: 'React Native', category: 'APP_DEVELOPMENT', description: 'Cross-platform mobile development with React and JavaScript' },
  { name: 'Android', category: 'APP_DEVELOPMENT', description: 'Native Android application development with Kotlin / Java' },

  // AI / ML
  { name: 'Python', category: 'AI_ML', description: 'Python programming for data science, scripting, and machine learning' },
  { name: 'Machine Learning', category: 'AI_ML', description: 'Supervised, unsupervised algorithms and predictive modeling' },
  { name: 'Deep Learning', category: 'AI_ML', description: 'Neural networks, CNNs, RNNs, and transformer architectures' },
  { name: 'TensorFlow', category: 'AI_ML', description: 'Open source machine learning framework by Google' },
  { name: 'PyTorch', category: 'AI_ML', description: 'Dynamic deep learning framework for research and production' },
  { name: 'NLP', category: 'AI_ML', description: 'Natural Language Processing and text processing algorithms' },
  { name: 'Computer Vision', category: 'AI_ML', description: 'Image processing, object detection, and visual recognition' },

  // UI/UX
  { name: 'Figma', category: 'UI_UX', description: 'Collaborative interface design, wireframing, and interactive prototyping' },
  { name: 'Adobe XD', category: 'UI_UX', description: 'Vector-based user experience and user interface design' },

  // GRAPHIC DESIGN
  { name: 'Photoshop', category: 'GRAPHIC_DESIGN', description: 'Raster graphics editing, photo manipulation, and visual design' },
  { name: 'Illustrator', category: 'GRAPHIC_DESIGN', description: 'Vector graphics, typography, branding, and illustration' },
  { name: 'Canva', category: 'GRAPHIC_DESIGN', description: 'Rapid marketing material, social media graphics, and presentation design' },

  // VIDEO EDITING
  { name: 'Premiere Pro', category: 'VIDEO_EDITING', description: 'Professional timeline-based video editing and production' },
  { name: 'After Effects', category: 'VIDEO_EDITING', description: 'Motion graphics, visual effects, and title animation' },
  { name: 'DaVinci Resolve', category: 'VIDEO_EDITING', description: 'Color grading, video editing, and audio post-production' },

  // CONTENT
  { name: 'Content Writing', category: 'CONTENT_WRITING', description: 'Technical and creative articles, documentation, and blog posts' },
  { name: 'Copywriting', category: 'CONTENT_WRITING', description: 'Persuasive marketing copy, landing page content, and ad copy' },

  // MARKETING
  { name: 'Digital Marketing', category: 'DIGITAL_MARKETING', description: 'Online marketing strategies, campaign planning, and growth hacking' },
  { name: 'SEO', category: 'DIGITAL_MARKETING', description: 'Search engine optimization, keyword research, and on-page/off-page SEO' },
  { name: 'Social Media Marketing', category: 'DIGITAL_MARKETING', description: 'Brand engagement, audience growth, and content distribution across social channels' }
];

/**
 * Seed initial skills idempotently without creating duplicates
 */
const seedSkills = async () => {
  try {
    await connectDB();

    console.log(`[Seed] Processing ${initialSkills.length} predefined skills...`);

    const operations = initialSkills.map((skill) => ({
      updateOne: {
        filter: { name: skill.name },
        update: { $set: skill },
        upsert: true
      }
    }));

    const result = await Skill.bulkWrite(operations);
    console.log(`[Seed] Skills seed complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated, ${result.matchedCount} already matched.`);

    const totalCount = await Skill.countDocuments();
    console.log(`[Seed] Total skills currently in database: ${totalCount}`);

    return totalCount;
  } catch (error) {
    console.error(`[Seed Error] Failed to seed skills: ${error.message}`);
    throw error;
  }
};

// Run directly when executed via node seed/skills.js
if (require.main === module) {
  seedSkills()
    .then(() => {
      console.log('[Seed] Disconnecting from database...');
      return mongoose.disconnect();
    })
    .then(() => {
      console.log('[Seed] Database disconnected cleanly.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Process failed:', err.message);
      mongoose.disconnect().finally(() => process.exit(1));
    });
}

module.exports = { seedSkills, initialSkills };
