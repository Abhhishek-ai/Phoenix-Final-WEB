const express = require('express');
const bidController = require('../controllers/bidController');
const { requireAuth, requireActiveFreelancer } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// ============================================================================
// FREELANCER BIDDING & ASSIGNMENT ROUTES
// ============================================================================
router.get('/freelancer/projects/:projectId/bid', requireActiveFreelancer, bidController.showBidForm);
router.post('/freelancer/projects/:projectId/bid', requireActiveFreelancer, bidController.createBid);
router.get('/freelancer/bids', requireActiveFreelancer, bidController.freelancerBids);
router.get('/freelancer/bids/:id', requireActiveFreelancer, bidController.freelancerBidDetails);
router.get('/freelancer/assignments', requireActiveFreelancer, bidController.freelancerAssignments);

// ============================================================================
// ADMIN BID MANAGEMENT & PLATFORM ASSIGNMENTS ROUTES
// ============================================================================
router.get('/admin/projects/:projectId/bids', requireAuth, requireRole('ADMIN'), bidController.adminProjectBids);
router.post('/admin/bids/:bidId/accept', requireAuth, requireRole('ADMIN'), bidController.acceptBid);
router.post('/admin/bids/:bidId/reject', requireAuth, requireRole('ADMIN'), bidController.rejectBid);
router.get('/admin/assignments', requireAuth, requireRole('ADMIN'), bidController.adminAssignments);

module.exports = router;
