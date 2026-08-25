const express = require('express');
const portfolioController = require('../controllers/portfolioController');
const { requireAuth, requireActiveFreelancer } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { upload } = require('../middleware/upload');

const router = express.Router();

// Public Showcase Gallery
router.get('/portfolio', portfolioController.publicShowcase);

// Freelancer Portfolio Management
router.get('/freelancer/portfolio', requireActiveFreelancer, portfolioController.freelancerPortfolioList);
router.get('/freelancer/portfolio/create', requireActiveFreelancer, portfolioController.showCreatePortfolio);
router.post(
  '/freelancer/portfolio',
  requireActiveFreelancer,
  upload.array('images', 4),
  portfolioController.createPortfolio
);
router.post('/freelancer/portfolio/:id/delete', requireActiveFreelancer, portfolioController.deletePortfolio);

// Admin Portfolio Approval
router.get('/admin/portfolios', requireAuth, requireRole('ADMIN'), portfolioController.adminPortfolioList);
router.post('/admin/portfolios/:id/approve', requireAuth, requireRole('ADMIN'), portfolioController.approvePortfolio);
router.post('/admin/portfolios/:id/reject', requireAuth, requireRole('ADMIN'), portfolioController.rejectPortfolio);

module.exports = router;
