const Project = require('../models/Project');
const Skill = require('../models/Skill');
const Bid = require('../models/Bid');
const Assignment = require('../models/Assignment');
const User = require('../models/User');

const PROJECT_CATEGORIES = [
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
 * ADMIN PROJECT CONTROLLER METHODS
 * ============================================================================
 */

/**
 * List all projects for administrator with search, status filters & bid counts
 * GET /admin/projects
 */
const adminProjects = async (req, res) => {
  try {
    const { status, category, q, sort } = req.query;
    const filterQuery = {};

    const validStatuses = ['DRAFT', 'OPEN', 'BIDDING', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVISION_REQUIRED', 'COMPLETED', 'CANCELLED'];
    if (status && validStatuses.includes(status.toUpperCase())) {
      filterQuery.status = status.toUpperCase();
    }

    if (category && PROJECT_CATEGORIES.includes(category.toUpperCase())) {
      filterQuery.category = category.toUpperCase();
    }

    if (q && q.trim().length > 0) {
      filterQuery.title = new RegExp(q.trim(), 'i');
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'deadline') sortOption = { deadline: 1 };

    const projects = await Project.find(filterQuery)
      .populate('createdBy', 'name email')
      .populate({
        path: 'selectedBid',
        populate: { path: 'freelancerId', select: 'name email' }
      })
      .sort(sortOption)
      .lean();

    // Attach bid counts for each project
    const projectIds = projects.map((p) => p._id);
    const bidCountAgg = await Bid.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$projectId', totalBids: { $sum: 1 } } }
    ]);

    const bidCountMap = new Map();
    bidCountAgg.forEach((b) => bidCountMap.set(b._id.toString(), b.totalBids));

    const enrichedProjects = projects.map((p) => ({
      ...p,
      totalBids: bidCountMap.get(p._id.toString()) || 0
    }));

    res.render('admin/projects', {
      title: 'Manage Projects | PHOENIX Admin',
      activePage: 'projects',
      projects: enrichedProjects,
      categories: PROJECT_CATEGORIES,
      currentStatus: status ? status.toUpperCase() : 'ALL',
      currentCategory: category ? category.toUpperCase() : 'ALL',
      searchQuery: q || '',
      currentSort: sort || 'newest'
    });
  } catch (error) {
    console.error('[Admin Projects List Error]:', error);
    req.flash('error_msg', 'Failed to retrieve project directory.');
    res.redirect('/admin/dashboard');
  }
};

/**
 * Render Project Creation Page
 * GET /admin/projects/create
 */
const showCreateProject = async (req, res) => {
  try {
    const skills = await Skill.find().sort({ category: 1, name: 1 }).lean();

    res.render('admin/project-create', {
      title: 'Create New Project | PHOENIX Admin',
      activePage: 'projects',
      categories: PROJECT_CATEGORIES,
      skills,
      formData: {},
      errors: {}
    });
  } catch (error) {
    console.error('[Show Create Project Error]:', error);
    req.flash('error_msg', 'Failed to load project creation form.');
    res.redirect('/admin/projects');
  }
};

/**
 * Handle Project Creation Submission
 * POST /admin/projects
 */
const createProject = async (req, res) => {
  const { title, description, category, requiredSkills, minBudget, maxBudget, deadline } = req.body;

  const formData = {
    title: title || '',
    description: description || '',
    category: category || '',
    requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : (requiredSkills ? [requiredSkills] : []),
    minBudget: minBudget || '',
    maxBudget: maxBudget || '',
    deadline: deadline || ''
  };

  const errors = {};

  if (!title || title.trim().length < 3) {
    errors.title = 'Project title must be at least 3 characters long.';
  }

  if (!description || description.trim().length < 10) {
    errors.description = 'Project description must be at least 10 characters long.';
  }

  if (!category || !PROJECT_CATEGORIES.includes(category)) {
    errors.category = 'Please select a valid project domain category.';
  }

  const numMin = Number(minBudget);
  const numMax = Number(maxBudget);

  if (isNaN(numMin) || numMin < 0) {
    errors.minBudget = 'Minimum budget must be a positive number or 0.';
  }

  if (isNaN(numMax) || numMax < numMin) {
    errors.maxBudget = 'Maximum budget must be greater than or equal to minimum budget.';
  }

  if (!deadline) {
    errors.deadline = 'Project deadline is required.';
  } else {
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime()) || deadlineDate <= new Date()) {
      errors.deadline = 'Deadline must be a valid future date.';
    }
  }

  if (Object.keys(errors).length > 0) {
    const skills = await Skill.find().sort({ category: 1, name: 1 }).lean();
    return res.status(422).render('admin/project-create', {
      title: 'Create New Project | PHOENIX Admin',
      activePage: 'projects',
      categories: PROJECT_CATEGORIES,
      skills,
      formData,
      errors
    });
  }

  try {
    const selectedSkills = formData.requiredSkills.filter(Boolean);

    await Project.create({
      title: title.trim(),
      description: description.trim(),
      category,
      requiredSkills: selectedSkills,
      budget: {
        min: numMin,
        max: numMax,
        currency: 'INR'
      },
      deadline: new Date(deadline),
      createdBy: req.session.userId,
      status: 'OPEN'
    });

    req.flash('success_msg', 'Project created successfully.');
    res.redirect('/admin/projects');
  } catch (error) {
    console.error('[Create Project Error]:', error);
    req.flash('error_msg', 'Failed to create project. Please try again.');
    const skills = await Skill.find().sort({ category: 1, name: 1 }).lean();
    res.status(500).render('admin/project-create', {
      title: 'Create New Project | PHOENIX Admin',
      activePage: 'projects',
      categories: PROJECT_CATEGORIES,
      skills,
      formData,
      errors: { general: 'An unexpected database error occurred.' }
    });
  }
};

/**
 * View Project Details for Administrator
 * GET /admin/projects/:id
 */
const adminProjectDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate('requiredSkills')
      .populate('createdBy', 'name email')
      .populate({
        path: 'selectedBid',
        populate: { path: 'freelancerId', select: 'name email' }
      })
      .lean();

    if (!project) {
      req.flash('error_msg', 'Project not found.');
      return res.redirect('/admin/projects');
    }

    const totalBids = await Bid.countDocuments({ projectId: project._id });

    let assignment = null;
    if (project.status === 'ASSIGNED' || project.status === 'IN_PROGRESS' || project.status === 'COMPLETED') {
      assignment = await Assignment.findOne({ projectId: project._id })
        .populate('freelancerId', 'name email')
        .populate('assignedBy', 'name email')
        .lean();
    }

    res.render('admin/project-details', {
      title: `${project.title} | PHOENIX Admin`,
      activePage: 'projects',
      project,
      totalBids,
      assignment
    });
  } catch (error) {
    console.error('[Admin Project Details Error]:', error);
    req.flash('error_msg', 'Failed to load project details.');
    res.redirect('/admin/projects');
  }
};

/**
 * Handle Admin Project Status State Transitions (OPEN <-> CANCELLED)
 * POST /admin/projects/:id/status
 */
const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      req.flash('error_msg', 'Project not found.');
      return res.redirect('/admin/projects');
    }

    const current = project.status;
    const target = status ? status.toUpperCase() : '';

    // Allowed transitions for this phase: DRAFT -> OPEN, OPEN -> CANCELLED, CANCELLED -> OPEN
    if (target === 'CANCELLED' && current === 'OPEN') {
      project.status = 'CANCELLED';
      await project.save();
      req.flash('warning_msg', 'Project cancelled.');
    } else if (target === 'OPEN' && (current === 'CANCELLED' || current === 'DRAFT')) {
      project.status = 'OPEN';
      await project.save();
      req.flash('success_msg', 'Project reopened.');
    } else {
      req.flash('error_msg', `Invalid status transition from ${current} to ${target}.`);
    }

    res.redirect(`/admin/projects/${id}`);
  } catch (error) {
    console.error('[Update Project Status Error]:', error);
    req.flash('error_msg', 'Failed to update project status.');
    res.redirect(`/admin/projects/${req.params.id}`);
  }
};

/**
 * ============================================================================
 * FREELANCER MARKETPLACE & DASHBOARD METHODS
 * ============================================================================
 */

/**
 * Freelancer Dashboard View
 * GET /freelancer/dashboard
 */
const freelancerDashboard = async (req, res) => {
  try {
    const freelancerId = req.session.userId;

    const [activeProjectsCount, pendingBidsCount, completedProjectsCount, activeAssignments, recentOpenProjects] = await Promise.all([
      Assignment.countDocuments({ freelancerId, status: { $nin: ['COMPLETED', 'CANCELLED'] } }),
      Bid.countDocuments({ freelancerId, status: 'PENDING' }),
      Assignment.countDocuments({ freelancerId, status: 'COMPLETED' }),
      Assignment.find({ freelancerId, status: { $nin: ['COMPLETED', 'CANCELLED'] } })
        .populate('projectId')
        .sort({ deadline: 1 })
        .limit(5)
        .lean(),
      Project.find({ status: 'OPEN' })
        .populate('requiredSkills')
        .sort({ createdAt: -1 })
        .limit(4)
        .lean()
    ]);

    const stats = {
      activeProjects: activeProjectsCount,
      pendingBids: pendingBidsCount,
      completedProjects: completedProjectsCount
    };

    res.render('freelancer/dashboard', {
      title: 'Freelancer Dashboard | PHOENIX',
      activePage: 'dashboard',
      stats,
      activeAssignments,
      recentOpenProjects
    });
  } catch (error) {
    console.error('[Freelancer Dashboard Error]:', error);
    req.flash('error_msg', 'Failed to load dashboard data.');
    res.render('freelancer/dashboard', {
      title: 'Freelancer Dashboard | PHOENIX',
      activePage: 'dashboard',
      stats: { activeProjects: 0, pendingBids: 0, completedProjects: 0 },
      activeAssignments: [],
      recentOpenProjects: []
    });
  }
};

/**
 * Freelancer Project Marketplace (Browse OPEN Projects)
 * GET /freelancer/projects
 */
const freelancerProjects = async (req, res) => {
  try {
    const { category, skill, search, q, sort } = req.query;
    const filterQuery = { status: 'OPEN' };

    const searchKey = search || q;
    if (searchKey && searchKey.trim().length > 0) {
      filterQuery.title = new RegExp(searchKey.trim(), 'i');
    }

    if (category && PROJECT_CATEGORIES.includes(category.toUpperCase())) {
      filterQuery.category = category.toUpperCase();
    }

    if (skill) {
      filterQuery.requiredSkills = skill;
    }

    // Whitelist allowed sort values
    let sortOption = { createdAt: -1 };
    if (sort === 'deadline') sortOption = { deadline: 1 };
    if (sort === 'budget_asc') sortOption = { 'budget.min': 1 };
    if (sort === 'budget_desc') sortOption = { 'budget.max': -1 };

    const [projects, skills] = await Promise.all([
      Project.find(filterQuery)
        .populate('requiredSkills')
        .sort(sortOption)
        .lean(),
      Skill.find().sort({ name: 1 }).lean()
    ]);

    res.render('freelancer/projects', {
      title: 'Project Marketplace | PHOENIX',
      activePage: 'projects',
      projects,
      skills,
      categories: PROJECT_CATEGORIES,
      currentCategory: category ? category.toUpperCase() : 'ALL',
      currentSkill: skill || '',
      searchQuery: searchKey || '',
      currentSort: sort || 'newest'
    });
  } catch (error) {
    console.error('[Freelancer Projects Marketplace Error]:', error);
    req.flash('error_msg', 'Failed to load project marketplace.');
    res.redirect('/freelancer/dashboard');
  }
};

/**
 * Freelancer Project Details Page
 * GET /freelancer/projects/:id
 */
const freelancerProjectDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.session.userId;

    const project = await Project.findById(id)
      .populate('requiredSkills')
      .populate('createdBy', 'name email')
      .lean();

    if (!project) {
      req.flash('error_msg', 'Project not found.');
      return res.redirect('/freelancer/projects');
    }

    // Check if the current freelancer has already submitted a bid for this project
    const existingBid = await Bid.findOne({
      projectId: project._id,
      freelancerId
    }).lean();

    res.render('freelancer/project-details', {
      title: `${project.title} | PHOENIX Marketplace`,
      activePage: 'projects',
      project,
      existingBid: existingBid || null
    });
  } catch (error) {
    console.error('[Freelancer Project Details Error]:', error);
    req.flash('error_msg', 'Failed to load project details.');
    res.redirect('/freelancer/projects');
  }
};

module.exports = {
  adminProjects,
  showCreateProject,
  createProject,
  adminProjectDetails,
  updateProjectStatus,
  freelancerDashboard,
  freelancerProjects,
  freelancerProjectDetails
};
