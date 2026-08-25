const User = require('../models/User');
const FreelancerProfile = require('../models/FreelancerProfile');
const Skill = require('../models/Skill');

/**
 * Admin Dashboard View
 * GET /admin/dashboard
 */
const dashboard = async (req, res) => {
  try {
    // 1. Query real MongoDB statistics
    const [totalFreelancers, pendingCount, activeCount, suspendedCount, rejectedCount] = await Promise.all([
      User.countDocuments({ role: 'FREELANCER' }),
      User.countDocuments({ role: 'FREELANCER', status: 'PENDING' }),
      User.countDocuments({ role: 'FREELANCER', status: 'ACTIVE' }),
      User.countDocuments({ role: 'FREELANCER', status: 'SUSPENDED' }),
      User.countDocuments({ role: 'FREELANCER', status: 'REJECTED' })
    ]);

    const stats = {
      total: totalFreelancers,
      pending: pendingCount,
      active: activeCount,
      suspended: suspendedCount,
      rejected: rejectedCount
    };

    // 2. Fetch Recent Registrations (newest first, limit 10)
    const recentUsers = await User.find({ role: 'FREELANCER' })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const userIds = recentUsers.map((u) => u._id);
    const profiles = await FreelancerProfile.find({ userId: { $in: userIds } }).lean();

    const profileMap = new Map();
    profiles.forEach((p) => {
      profileMap.set(p.userId.toString(), p);
    });

    const recentFreelancers = recentUsers.map((u) => ({
      ...u,
      profile: profileMap.get(u._id.toString()) || null
    }));

    res.render('admin/dashboard', {
      title: 'Admin Dashboard | PHOENIX - MBM University',
      activePage: 'dashboard',
      stats,
      recentFreelancers
    });
  } catch (error) {
    console.error('[Admin Dashboard Error]:', error);
    req.flash('error_msg', 'Failed to load dashboard data. Please try again.');
    res.status(500).render('admin/dashboard', {
      title: 'Admin Dashboard | PHOENIX',
      activePage: 'dashboard',
      stats: { total: 0, pending: 0, active: 0, suspended: 0, rejected: 0 },
      recentFreelancers: []
    });
  }
};

/**
 * Freelancer Management Directory
 * GET /admin/freelancers
 */
const freelancers = async (req, res) => {
  try {
    const { status, q } = req.query;
    const filterQuery = { role: 'FREELANCER' };

    // Apply Status Filter
    const validStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'];
    if (status && validStatuses.includes(status.toUpperCase())) {
      filterQuery.status = status.toUpperCase();
    }

    // Apply Search Query (Name, Email, Enrollment Number)
    let matchingUserIds = null;
    if (q && q.trim().length > 0) {
      const searchRegex = new RegExp(q.trim(), 'i');

      // Search matching FreelancerProfiles by enrollmentNumber
      const matchingProfiles = await FreelancerProfile.find({
        enrollmentNumber: searchRegex
      }).select('userId').lean();

      const profileUserIds = matchingProfiles.map((p) => p.userId);

      filterQuery.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { _id: { $in: profileUserIds } }
      ];
    }

    const users = await User.find(filterQuery)
      .sort({ createdAt: -1 })
      .lean();

    const userIds = users.map((u) => u._id);
    const profiles = await FreelancerProfile.find({ userId: { $in: userIds } }).lean();

    const profileMap = new Map();
    profiles.forEach((p) => {
      profileMap.set(p.userId.toString(), p);
    });

    const freelancerList = users.map((u) => ({
      ...u,
      profile: profileMap.get(u._id.toString()) || null
    }));

    res.render('admin/freelancers', {
      title: 'Manage Freelancers | PHOENIX Admin',
      activePage: 'freelancers',
      freelancers: freelancerList,
      currentStatus: status ? status.toUpperCase() : 'ALL',
      searchQuery: q || ''
    });
  } catch (error) {
    console.error('[Admin Freelancers List Error]:', error);
    req.flash('error_msg', 'Failed to retrieve freelancers list.');
    res.redirect('/admin/dashboard');
  }
};

/**
 * Freelancer Profile Details
 * GET /admin/freelancers/:id
 */
const freelancerDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, role: 'FREELANCER' }).lean();
    if (!user) {
      req.flash('error_msg', 'Freelancer account not found.');
      return res.redirect('/admin/freelancers');
    }

    const profile = await FreelancerProfile.findOne({ userId: user._id })
      .populate('skills')
      .lean();

    res.render('admin/freelancer-details', {
      title: `${user.name} - Freelancer Profile | PHOENIX Admin`,
      activePage: 'freelancers',
      freelancer: user,
      profile: profile || {}
    });
  } catch (error) {
    console.error('[Admin Freelancer Details Error]:', error);
    req.flash('error_msg', 'Failed to load freelancer details.');
    res.redirect('/admin/freelancers');
  }
};

/**
 * Approve Freelancer Registration
 * POST /admin/freelancers/:id/approve
 */
const approveFreelancer = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOneAndUpdate(
      { _id: id, role: 'FREELANCER' },
      { status: 'ACTIVE' },
      { new: true }
    );

    if (!user) {
      req.flash('error_msg', 'Freelancer account not found.');
      return res.redirect('/admin/freelancers');
    }

    req.flash('success_msg', 'Freelancer approved successfully.');
    res.redirect(`/admin/freelancers/${id}`);
  } catch (error) {
    console.error('[Approve Freelancer Error]:', error);
    req.flash('error_msg', 'Failed to approve freelancer.');
    res.redirect(`/admin/freelancers/${req.params.id}`);
  }
};

/**
 * Reject Freelancer Registration
 * POST /admin/freelancers/:id/reject
 */
const rejectFreelancer = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOneAndUpdate(
      { _id: id, role: 'FREELANCER' },
      { status: 'REJECTED' },
      { new: true }
    );

    if (!user) {
      req.flash('error_msg', 'Freelancer account not found.');
      return res.redirect('/admin/freelancers');
    }

    req.flash('warning_msg', 'Freelancer registration rejected.');
    res.redirect(`/admin/freelancers/${id}`);
  } catch (error) {
    console.error('[Reject Freelancer Error]:', error);
    req.flash('error_msg', 'Failed to reject freelancer registration.');
    res.redirect(`/admin/freelancers/${req.params.id}`);
  }
};

/**
 * Suspend Freelancer Account
 * POST /admin/freelancers/:id/suspend
 */
const suspendFreelancer = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOneAndUpdate(
      { _id: id, role: 'FREELANCER' },
      { status: 'SUSPENDED' },
      { new: true }
    );

    if (!user) {
      req.flash('error_msg', 'Freelancer account not found.');
      return res.redirect('/admin/freelancers');
    }

    req.flash('warning_msg', 'Freelancer suspended.');
    res.redirect(`/admin/freelancers/${id}`);
  } catch (error) {
    console.error('[Suspend Freelancer Error]:', error);
    req.flash('error_msg', 'Failed to suspend freelancer account.');
    res.redirect(`/admin/freelancers/${req.params.id}`);
  }
};

/**
 * Reactivate Freelancer Account
 * POST /admin/freelancers/:id/reactivate
 */
const reactivateFreelancer = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOneAndUpdate(
      { _id: id, role: 'FREELANCER' },
      { status: 'ACTIVE' },
      { new: true }
    );

    if (!user) {
      req.flash('error_msg', 'Freelancer account not found.');
      return res.redirect('/admin/freelancers');
    }

    req.flash('success_msg', 'Freelancer reactivated.');
    res.redirect(`/admin/freelancers/${id}`);
  } catch (error) {
    console.error('[Reactivate Freelancer Error]:', error);
    req.flash('error_msg', 'Failed to reactivate freelancer account.');
    res.redirect(`/admin/freelancers/${req.params.id}`);
  }
};

module.exports = {
  dashboard,
  freelancers,
  freelancerDetails,
  approveFreelancer,
  rejectFreelancer,
  suspendFreelancer,
  reactivateFreelancer
};
