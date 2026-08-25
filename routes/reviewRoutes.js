const express = require('express');
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

router.get('/admin/assignments/:id/review', requireAuth, requireRole('ADMIN'), reviewController.showReviewForm);
router.post('/admin/assignments/:id/review', requireAuth, requireRole('ADMIN'), reviewController.submitReview);

module.exports = router;
