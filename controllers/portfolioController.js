const PortfolioWork = require('../models/PortfolioWork');
const Skill = require('../models/Skill');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../middleware/upload');
const { sendNotification } = require('../services/notificationService');

const PORTFOLIO_CATEGORIES = [
  'WEB_DEVELOPMENT',
  'APP_DEVELOPMENT',
  'AI_ML',
  'UI_UX',
  'GRAPHIC_DESIGN',
  'VIDEO_EDITING',
  'CONTENT_WRITING',
  'DIGITAL_MARKETING',
  'DATA_ANALYTICS',
  'PHOTOGRAPHY',
  'OTHER'
];

/**
 * ============================================================================
 * FREELANCER PORTFOLIO CONTROLLER METHODS
 * ============================================================================
 */

/**
 * List logged-in freelancer's portfolio projects
 * GET /freelancer/portfolio
 */
const freelancerPortfolioList = async (req, res) => {
  try {
    const freelancerId = req.session.userId;
    const portfolioItems = await PortfolioWork.find({ freelancerId })
      .populate('skills')
      .sort({ createdAt: -1 })
      .lean();

    res.render('freelancer/portfolio', {
      title: 'My Portfolio Showcase | PHOENIX',
      activePage: 'portfolio',
      portfolioItems
    });
  } catch (error) {
    console.error('[Freelancer Portfolio List Error]:', error);
    req.flash('error_msg', 'Failed to load portfolio items.');
    res.redirect('/freelancer/dashboard');
  }
};

/**
 * Render create portfolio item page
 * GET /freelancer/portfolio/create
 */
const showCreatePortfolio = async (req, res) => {
  try {
    const skills = await Skill.find().sort({ category: 1, name: 1 }).lean();

    res.render('freelancer/portfolio-create', {
      title: 'Add Portfolio Project | PHOENIX',
      activePage: 'portfolio',
      categories: PORTFOLIO_CATEGORIES,
      skills,
      formData: {},
      errors: {}
    });
  } catch (error) {
    console.error('[Show Create Portfolio Error]:', error);
    req.flash('error_msg', 'Failed to load portfolio submission form.');
    res.redirect('/freelancer/portfolio');
  }
};

/**
 * Handle portfolio project upload
 * POST /freelancer/portfolio
 */
const createPortfolio = async (req, res) => {
  const freelancerId = req.session.userId;
  const { title, description, category, skills, projectLink, githubLink } = req.body;

  const uploadedMedia = [];

  try {
    if (!title || title.trim().length < 3) {
      req.flash('error_msg', 'Portfolio title must be at least 3 characters long.');
      return res.redirect('/freelancer/portfolio/create');
    }

    if (!description || description.trim().length < 10) {
      req.flash('error_msg', 'Description must be at least 10 characters long.');
      return res.redirect('/freelancer/portfolio/create');
    }

    if (!category || !PORTFOLIO_CATEGORIES.includes(category)) {
      req.flash('error_msg', 'Please select a valid domain category.');
      return res.redirect('/freelancer/portfolio/create');
    }

    // Upload screenshots to Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadRes = await uploadBufferToCloudinary(
          file.buffer,
          file.originalname,
          file.mimetype,
          'phoenix/portfolio'
        );
        uploadedMedia.push({
          url: uploadRes.url,
          publicId: uploadRes.publicId,
          type: 'image',
          originalName: uploadRes.originalName
        });
      }
    }

    const selectedSkills = Array.isArray(skills) ? skills : (skills ? [skills] : []);

    await PortfolioWork.create({
      freelancerId,
      title: title.trim(),
      description: description.trim(),
      category,
      skills: selectedSkills.filter(Boolean),
      media: uploadedMedia,
      projectLink: projectLink ? projectLink.trim() : '',
      githubLink: githubLink ? githubLink.trim() : '',
      status: 'PENDING_REVIEW'
    });

    req.flash('success_msg', 'Portfolio project submitted for coordinator approval.');
    res.redirect('/freelancer/portfolio');
  } catch (error) {
    console.error('[Create Portfolio Error]:', error);

    for (const m of uploadedMedia) {
      await deleteFromCloudinary(m.publicId);
    }

    req.flash('error_msg', error.message || 'Failed to submit portfolio project.');
    res.redirect('/freelancer/portfolio/create');
  }
};

/**
 * Delete a portfolio item
 * POST /freelancer/portfolio/:id/delete
 */
const deletePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.session.userId;

    const item = await PortfolioWork.findOneAndDelete({ _id: id, freelancerId });
    if (item && item.media) {
      for (const m of item.media) {
        await deleteFromCloudinary(m.publicId);
      }
    }

    req.flash('success_msg', 'Portfolio item removed.');
    res.redirect('/freelancer/portfolio');
  } catch (error) {
    console.error('[Delete Portfolio Error]:', error);
    req.flash('error_msg', 'Failed to delete portfolio project.');
    res.redirect('/freelancer/portfolio');
  }
};

/**
 * ============================================================================
 * ADMIN PORTFOLIO APPROVAL CONTROLLER METHODS
 * ============================================================================
 */

/**
 * List portfolio submissions for Admin Review
 * GET /admin/portfolios
 */
const adminPortfolioList = async (req, res) => {
  try {
    const { status } = req.query;
    const filterQuery = {};

    if (status && ['PENDING_REVIEW', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
      filterQuery.status = status.toUpperCase();
    }

    const portfolios = await PortfolioWork.find(filterQuery)
      .populate('freelancerId', 'name email')
      .populate('skills')
      .sort({ createdAt: -1 })
      .lean();

    res.render('admin/portfolios', {
      title: 'Portfolio Approval Queue | PHOENIX Admin',
      activePage: 'portfolios',
      portfolios,
      currentStatus: status ? status.toUpperCase() : 'ALL'
    });
  } catch (error) {
    console.error('[Admin Portfolio List Error]:', error);
    req.flash('error_msg', 'Failed to load portfolio queue.');
    res.redirect('/admin/dashboard');
  }
};

/**
 * Approve a portfolio submission
 * POST /admin/portfolios/:id/approve
 */
const approvePortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.session.userId;

    const item = await PortfolioWork.findByIdAndUpdate(
      id,
      { status: 'APPROVED', reviewedBy: adminId },
      { new: true }
    );

    if (item) {
      await sendNotification(
        item.freelancerId,
        'PORTFOLIO_APPROVED',
        'Portfolio Project Approved! 🎨',
        `Your project "${item.title}" was approved by coordinators and is now live on the public showcase.`,
        '/portfolio'
      );
    }

    req.flash('success_msg', 'Portfolio item approved and published to public showcase.');
    res.redirect('/admin/portfolios');
  } catch (error) {
    console.error('[Approve Portfolio Error]:', error);
    req.flash('error_msg', 'Failed to approve portfolio item.');
    res.redirect('/admin/portfolios');
  }
};

/**
 * Reject a portfolio submission
 * POST /admin/portfolios/:id/reject
 */
const rejectPortfolio = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.session.userId;

    await PortfolioWork.findByIdAndUpdate(id, {
      status: 'REJECTED',
      reviewedBy: adminId
    });

    req.flash('warning_msg', 'Portfolio item rejected.');
    res.redirect('/admin/portfolios');
  } catch (error) {
    console.error('[Reject Portfolio Error]:', error);
    req.flash('error_msg', 'Failed to reject portfolio item.');
    res.redirect('/admin/portfolios');
  }
};

/**
 * ============================================================================
 * PUBLIC PORTFOLIO SHOWCASE GALLERY
 * ============================================================================
 */

/**
 * Public showcase gallery of student portfolio projects
 * GET /portfolio
 */
const publicShowcase = async (req, res) => {
  try {
    const { category } = req.query;
    const filterQuery = { status: 'APPROVED' };

    if (category && PORTFOLIO_CATEGORIES.includes(category.toUpperCase())) {
      filterQuery.category = category.toUpperCase();
    }

    const projects = await PortfolioWork.find(filterQuery)
      .populate('freelancerId', 'name email')
      .populate('skills')
      .sort({ createdAt: -1 })
      .lean();

    res.render('public/portfolio-gallery', {
      title: 'Student Innovation & Portfolio Showcase | PHOENIX',
      activePage: 'portfolio',
      projects,
      categories: PORTFOLIO_CATEGORIES,
      currentCategory: category ? category.toUpperCase() : 'ALL'
    });
  } catch (error) {
    console.error('[Public Showcase Error]:', error);
    res.render('public/portfolio-gallery', {
      title: 'Student Innovation & Portfolio Showcase | PHOENIX',
      activePage: 'portfolio',
      projects: [],
      categories: PORTFOLIO_CATEGORIES,
      currentCategory: 'ALL'
    });
  }
};

module.exports = {
  freelancerPortfolioList,
  showCreatePortfolio,
  createPortfolio,
  deletePortfolio,
  adminPortfolioList,
  approvePortfolio,
  rejectPortfolio,
  publicShowcase
};
