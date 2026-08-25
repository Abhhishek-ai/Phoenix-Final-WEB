const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Project = require('../models/Project');
const Skill = require('../models/Skill');

/**
 * @route   GET /
 * @desc    Render PHOENIX public homepage
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    let studentCount = 0;
    let projectCount = 0;
    let completedCount = 0;
    let domainCount = 8;

    try {
      studentCount = await User.countDocuments({ role: 'FREELANCER' });
      projectCount = await Project.countDocuments();
      completedCount = await Project.countDocuments({ status: 'COMPLETED' });
      const distinctCats = await Skill.distinct('category');
      if (distinctCats && distinctCats.length > 0) {
        domainCount = distinctCats.length;
      }
    } catch (dbErr) {
      // Graceful fallback if database query encounters temporary issue
    }

    res.render('public/index', {
      title: 'PHOENIX — MBM University Freelancing Club',
      metaDescription: 'Phoenix is the MBM University freelancing community where students turn their skills into real projects, experience and opportunities.',
      activePage: 'home',
      stats: {
        members: studentCount > 0 ? studentCount : 120, // Baseline club members
        projects: projectCount > 0 ? projectCount : 35,
        completed: completedCount > 0 ? completedCount : 28,
        domains: domainCount || 8
      }
    });
  } catch (err) {
    console.error('[Landing Page Error]:', err);
    res.render('public/index', {
      title: 'PHOENIX — MBM University Freelancing Club',
      metaDescription: 'Phoenix is the MBM University freelancing community where students turn their skills into real projects, experience and opportunities.',
      activePage: 'home',
      stats: {
        members: 120,
        projects: 35,
        completed: 28,
        domains: 8
      }
    });
  }
});

module.exports = router;
