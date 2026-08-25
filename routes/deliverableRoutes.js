const express = require('express');
const deliverableController = require('../controllers/deliverableController');
const { requireAuth, requireActiveFreelancer } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { upload } = require('../middleware/upload');

const router = express.Router();

// ============================================================================
// FREELANCER WORKSPACE, PROGRESS & WORK SUBMISSION ROUTES
// ============================================================================
router.get('/freelancer/assignments/:id', requireActiveFreelancer, deliverableController.freelancerWorkspace);
router.post('/freelancer/assignments/:id/progress', requireActiveFreelancer, deliverableController.updateProgress);
router.get('/freelancer/assignments/:id/submit', requireActiveFreelancer, deliverableController.showSubmitWork);
router.post(
  '/freelancer/assignments/:id/submit',
  requireActiveFreelancer,
  upload.array('files', 5),
  deliverableController.submitWork
);

// ============================================================================
// ADMIN ASSIGNMENT WORKSPACE & DELIVERABLE REVIEW DECISION ROUTES
// ============================================================================
router.get('/admin/assignments/:id', requireAuth, requireRole('ADMIN'), deliverableController.adminAssignmentWorkspace);
router.post('/admin/deliverables/:id/approve', requireAuth, requireRole('ADMIN'), deliverableController.approveDeliverable);
router.post('/admin/deliverables/:id/revision', requireAuth, requireRole('ADMIN'), deliverableController.requestRevision);

module.exports = router;
