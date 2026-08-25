const express = require('express');
const projectController = require('../controllers/projectController');
const { requireAuth, requireActiveFreelancer } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// ============================================================================
// ADMIN PROJECT MANAGEMENT ROUTES
// ============================================================================
router.get('/admin/projects', requireAuth, requireRole('ADMIN'), projectController.adminProjects);
router.get('/admin/projects/create', requireAuth, requireRole('ADMIN'), projectController.showCreateProject);
router.post('/admin/projects', requireAuth, requireRole('ADMIN'), projectController.createProject);
router.get('/admin/projects/:id', requireAuth, requireRole('ADMIN'), projectController.adminProjectDetails);
router.post('/admin/projects/:id/status', requireAuth, requireRole('ADMIN'), projectController.updateProjectStatus);

// ============================================================================
// FREELANCER DASHBOARD & PROJECT MARKETPLACE ROUTES
// ============================================================================
router.get('/freelancer/dashboard', requireActiveFreelancer, projectController.freelancerDashboard);
router.get('/freelancer/projects', requireActiveFreelancer, projectController.freelancerProjects);
router.get('/freelancer/projects/:id', requireActiveFreelancer, projectController.freelancerProjectDetails);

module.exports = router;
