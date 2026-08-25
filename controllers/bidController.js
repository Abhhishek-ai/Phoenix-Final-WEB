const mongoose = require('mongoose');
const Bid = require('../models/Bid');
const Project = require('../models/Project');
const Assignment = require('../models/Assignment');
const FreelancerProfile = require('../models/FreelancerProfile');
const User = require('../models/User');

/**
 * ============================================================================
 * FREELANCER BIDDING CONTROLLER METHODS
 * ============================================================================
 */

/**
 * Render Bid Submission Form for an Open Project
 * GET /freelancer/projects/:projectId/bid
 */
const showBidForm = async (req, res) => {
  try {
    const { projectId } = req.params;
    const freelancerId = req.session.userId;

    const project = await Project.findById(projectId)
      .populate('requiredSkills')
      .populate('createdBy', 'name email')
      .lean();

    if (!project) {
      req.flash('error_msg', 'Project not found.');
      return res.redirect('/freelancer/projects');
    }

    if (project.status !== 'OPEN') {
      req.flash('error_msg', 'This project is no longer accepting bids.');
      return res.redirect(`/freelancer/projects/${projectId}`);
    }

    // Check if freelancer already has an active bid
    const existingBid = await Bid.findOne({
      projectId: project._id,
      freelancerId
    }).lean();

    if (existingBid) {
      req.flash('info_msg', 'You have already submitted a bid for this project.');
      return res.redirect(`/freelancer/bids/${existingBid._id}`);
    }

    res.render('freelancer/bid-create', {
      title: `Submit Proposal: ${project.title} | PHOENIX`,
      activePage: 'projects',
      project,
      formData: {},
      errors: {}
    });
  } catch (error) {
    console.error('[Show Bid Form Error]:', error);
    req.flash('error_msg', 'Failed to load proposal submission form.');
    res.redirect('/freelancer/projects');
  }
};

/**
 * Handle Proposal / Bid Submission
 * POST /freelancer/projects/:projectId/bid
 */
const createBid = async (req, res) => {
  const { projectId } = req.params;
  const freelancerId = req.session.userId;
  const { amount, estimatedDays, proposal } = req.body;

  const formData = {
    amount: amount || '',
    estimatedDays: estimatedDays || '',
    proposal: proposal || ''
  };

  const errors = {};

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    errors.amount = 'Bid amount must be a positive number greater than 0.';
  }

  const numDays = Number(estimatedDays);
  if (isNaN(numDays) || numDays <= 0 || !Number.isInteger(numDays)) {
    errors.estimatedDays = 'Estimated completion days must be a whole positive number (e.g. 5).';
  }

  if (!proposal || proposal.trim().length < 10) {
    errors.proposal = 'Proposal description must be at least 10 characters long.';
  } else if (proposal.trim().length > 5000) {
    errors.proposal = 'Proposal description exceeds the 5000 character limit.';
  }

  try {
    const project = await Project.findById(projectId)
      .populate('requiredSkills')
      .lean();

    if (!project) {
      req.flash('error_msg', 'Project not found.');
      return res.redirect('/freelancer/projects');
    }

    if (project.status !== 'OPEN') {
      req.flash('error_msg', 'This project is no longer accepting bids.');
      return res.redirect(`/freelancer/projects/${projectId}`);
    }

    // Duplicate bid prevention
    const existingBid = await Bid.findOne({
      projectId: project._id,
      freelancerId
    }).lean();

    if (existingBid) {
      req.flash('error_msg', 'You have already submitted a bid for this project.');
      return res.redirect(`/freelancer/bids/${existingBid._id}`);
    }

    if (Object.keys(errors).length > 0) {
      return res.status(422).render('freelancer/bid-create', {
        title: `Submit Proposal: ${project.title} | PHOENIX`,
        activePage: 'projects',
        project,
        formData,
        errors
      });
    }

    await Bid.create({
      projectId: project._id,
      freelancerId,
      amount: numAmount,
      estimatedDays: numDays,
      proposal: proposal.trim(),
      status: 'PENDING'
    });

    req.flash('success_msg', 'Bid submitted successfully.');
    res.redirect('/freelancer/bids');
  } catch (error) {
    console.error('[Create Bid Error]:', error);
    req.flash('error_msg', 'An error occurred while submitting your proposal.');
    res.redirect(`/freelancer/projects/${projectId}`);
  }
};

/**
 * List all bids for the authenticated freelancer
 * GET /freelancer/bids
 */
const freelancerBids = async (req, res) => {
  try {
    const freelancerId = req.session.userId;
    const { status } = req.query;

    const filterQuery = { freelancerId };
    const validStatuses = ['PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];
    if (status && validStatuses.includes(status.toUpperCase())) {
      filterQuery.status = status.toUpperCase();
    }

    const bids = await Bid.find(filterQuery)
      .populate({
        path: 'projectId',
        populate: { path: 'requiredSkills' }
      })
      .sort({ createdAt: -1 })
      .lean();

    res.render('freelancer/bids', {
      title: 'My Proposals & Bids | PHOENIX',
      activePage: 'bids',
      bids,
      currentStatus: status ? status.toUpperCase() : 'ALL'
    });
  } catch (error) {
    console.error('[Freelancer Bids List Error]:', error);
    req.flash('error_msg', 'Failed to retrieve your bids.');
    res.redirect('/freelancer/dashboard');
  }
};

/**
 * View single bid details for freelancer
 * GET /freelancer/bids/:id
 */
const freelancerBidDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.session.userId;

    const bid = await Bid.findOne({ _id: id, freelancerId })
      .populate({
        path: 'projectId',
        populate: [{ path: 'requiredSkills' }, { path: 'createdBy', select: 'name email' }]
      })
      .lean();

    if (!bid) {
      req.flash('error_msg', 'Bid proposal not found.');
      return res.redirect('/freelancer/bids');
    }

    let assignment = null;
    if (bid.status === 'ACCEPTED') {
      assignment = await Assignment.findOne({
        projectId: bid.projectId._id,
        freelancerId
      }).lean();
    }

    res.render('freelancer/bid-details', {
      title: `Bid Proposal Details | PHOENIX`,
      activePage: 'bids',
      bid,
      assignment
    });
  } catch (error) {
    console.error('[Freelancer Bid Details Error]:', error);
    req.flash('error_msg', 'Failed to load bid details.');
    res.redirect('/freelancer/bids');
  }
};

/**
 * List assignments for the authenticated freelancer
 * GET /freelancer/assignments
 */
const freelancerAssignments = async (req, res) => {
  try {
    const freelancerId = req.session.userId;

    const assignments = await Assignment.find({ freelancerId })
      .populate({
        path: 'projectId',
        populate: { path: 'requiredSkills' }
      })
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.render('freelancer/assignments', {
      title: 'My Project Assignments | PHOENIX',
      activePage: 'assignments',
      assignments
    });
  } catch (error) {
    console.error('[Freelancer Assignments Error]:', error);
    req.flash('error_msg', 'Failed to load assignments.');
    res.redirect('/freelancer/dashboard');
  }
};

/**
 * ============================================================================
 * ADMIN BID & ASSIGNMENT CONTROLLER METHODS
 * ============================================================================
 */

/**
 * Admin view of all bids for a project
 * GET /admin/projects/:projectId/bids
 */
const adminProjectBids = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId)
      .populate('requiredSkills')
      .populate('createdBy', 'name email')
      .lean();

    if (!project) {
      req.flash('error_msg', 'Project not found.');
      return res.redirect('/admin/projects');
    }

    const bids = await Bid.find({ projectId: project._id })
      .populate('freelancerId', 'name email')
      .sort({ amount: 1, createdAt: 1 })
      .lean();

    // Attach Freelancer Profile & Skills to each bid for comparison
    const freelancerUserIds = bids.map((b) => b.freelancerId && b.freelancerId._id).filter(Boolean);
    const profiles = await FreelancerProfile.find({ userId: { $in: freelancerUserIds } })
      .populate('skills')
      .lean();

    const profileMap = new Map();
    profiles.forEach((p) => profileMap.set(p.userId.toString(), p));

    const enrichedBids = bids.map((b) => ({
      ...b,
      profile: b.freelancerId ? profileMap.get(b.freelancerId._id.toString()) : null
    }));

    res.render('admin/project-bids', {
      title: `Bids for ${project.title} | PHOENIX Admin`,
      activePage: 'projects',
      project,
      bids: enrichedBids
    });
  } catch (error) {
    console.error('[Admin Project Bids Error]:', error);
    req.flash('error_msg', 'Failed to load project bids.');
    res.redirect('/admin/projects');
  }
};

/**
 * Concurrency-Safe Bid Acceptance & Automatic Project Assignment
 * POST /admin/bids/:bidId/accept
 */
const acceptBid = async (req, res) => {
  const { bidId } = req.params;
  const adminId = req.session.userId;

  let session = null;

  try {
    const bid = await Bid.findById(bidId);
    if (!bid) {
      req.flash('error_msg', 'Bid proposal not found.');
      return res.redirect('/admin/projects');
    }

    const projectId = bid.projectId;

    // Concurrency Check: Ensure project is currently OPEN
    const project = await Project.findOne({ _id: projectId, status: 'OPEN' });
    if (!project) {
      req.flash('error_msg', 'This project has already been assigned or is not open for bidding.');
      return res.redirect(`/admin/projects/${projectId}/bids`);
    }

    // Try MongoDB Transaction if available, with safe rollback fallback
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      // 1. Update Project Status to ASSIGNED and link selectedBid
      project.status = 'ASSIGNED';
      project.selectedBid = bid._id;
      await project.save({ session });

      // 2. Mark this Bid as ACCEPTED
      bid.status = 'ACCEPTED';
      await bid.save({ session });

      // 3. Create Assignment record
      await Assignment.create(
        [
          {
            projectId: project._id,
            freelancerId: bid.freelancerId,
            assignedBy: adminId,
            startDate: new Date(),
            deadline: project.deadline,
            status: 'ASSIGNED',
            progress: 0
          }
        ],
        { session }
      );

      // 4. Reject all other PENDING bids for this project
      await Bid.updateMany(
        {
          projectId: project._id,
          _id: { $ne: bid._id },
          status: 'PENDING'
        },
        { $set: { status: 'REJECTED' } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();
    } catch (txError) {
      if (session) {
        try {
          await session.abortTransaction();
          session.endSession();
        } catch (_) {}
      }

      console.warn('[Bid Acceptance Notice] Executing standalone fallback assignment:', txError.message);

      // Fallback for standalone MongoDB
      project.status = 'ASSIGNED';
      project.selectedBid = bid._id;
      await project.save();

      bid.status = 'ACCEPTED';
      await bid.save();

      await Assignment.create({
        projectId: project._id,
        freelancerId: bid.freelancerId,
        assignedBy: adminId,
        startDate: new Date(),
        deadline: project.deadline,
        status: 'ASSIGNED',
        progress: 0
      });

      await Bid.updateMany(
        {
          projectId: project._id,
          _id: { $ne: bid._id },
          status: 'PENDING'
        },
        { $set: { status: 'REJECTED' } }
      );
    }

    req.flash('success_msg', 'Bid accepted successfully. Project assigned successfully.');
    res.redirect(`/admin/projects/${projectId}`);
  } catch (error) {
    console.error('[Accept Bid Error]:', error);
    req.flash('error_msg', 'Failed to accept bid and create project assignment.');
    res.redirect('/admin/projects');
  }
};

/**
 * Reject a Single Bid
 * POST /admin/bids/:bidId/reject
 */
const rejectBid = async (req, res) => {
  const { bidId } = req.params;

  try {
    const bid = await Bid.findById(bidId);
    if (!bid) {
      req.flash('error_msg', 'Bid proposal not found.');
      return res.redirect('/admin/projects');
    }

    if (bid.status !== 'PENDING') {
      req.flash('error_msg', `Cannot reject bid with status '${bid.status}'.`);
      return res.redirect(`/admin/projects/${bid.projectId}/bids`);
    }

    bid.status = 'REJECTED';
    await bid.save();

    req.flash('warning_msg', 'Bid proposal rejected.');
    res.redirect(`/admin/projects/${bid.projectId}/bids`);
  } catch (error) {
    console.error('[Reject Bid Error]:', error);
    req.flash('error_msg', 'Failed to reject bid.');
    res.redirect('/admin/projects');
  }
};

/**
 * List all assignments for Administrator
 * GET /admin/assignments
 */
const adminAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find()
      .populate('projectId')
      .populate('freelancerId', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.render('admin/assignments', {
      title: 'Platform Assignments | PHOENIX Admin',
      activePage: 'assignments',
      assignments
    });
  } catch (error) {
    console.error('[Admin Assignments Error]:', error);
    req.flash('error_msg', 'Failed to load platform assignments.');
    res.redirect('/admin/dashboard');
  }
};

module.exports = {
  showBidForm,
  createBid,
  freelancerBids,
  freelancerBidDetails,
  freelancerAssignments,
  adminProjectBids,
  acceptBid,
  rejectBid,
  adminAssignments
};
