const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// Enforce authentication and ADMIN role on all admin routes
router.use(requireAuth);
router.use(requireRole('ADMIN'));

// Admin Dashboard
router.get('/dashboard', adminController.dashboard);

// Freelancer Management Directory & Details
router.get('/freelancers', adminController.freelancers);
router.get('/freelancers/:id', adminController.freelancerDetails);

// Freelancer Approval and Status State Transitions
router.post('/freelancers/:id/approve', adminController.approveFreelancer);
router.post('/freelancers/:id/reject', adminController.rejectFreelancer);
router.post('/freelancers/:id/suspend', adminController.suspendFreelancer);
router.post('/freelancers/:id/reactivate', adminController.reactivateFreelancer);

module.exports = router;
