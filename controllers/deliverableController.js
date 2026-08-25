const Assignment = require('../models/Assignment');
const Project = require('../models/Project');
const Deliverable = require('../models/Deliverable');
const FreelancerProfile = require('../models/FreelancerProfile');
const User = require('../models/User');
const { uploadBufferToCloudinary, deleteFromCloudinary } = require('../middleware/upload');

/**
 * ============================================================================
 * FREELANCER ASSIGNMENT & DELIVERABLE CONTROLLER METHODS
 * ============================================================================
 */

/**
 * Freelancer Assignment Workspace (Project Brief, Progress, & Submission History)
 * GET /freelancer/assignments/:id
 */
const freelancerWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.session.userId;

    const assignment = await Assignment.findOne({ _id: id, freelancerId })
      .populate({
        path: 'projectId',
        populate: [{ path: 'requiredSkills' }, { path: 'createdBy', select: 'name email' }]
      })
      .populate('assignedBy', 'name email')
      .lean();

    if (!assignment) {
      req.flash('error_msg', 'Project assignment not found or access denied.');
      return res.redirect('/freelancer/assignments');
    }

    // Fetch submission deliverables history sorted by newest version first
    const deliverables = await Deliverable.find({ assignmentId: assignment._id })
      .populate('reviewedBy', 'name email')
      .sort({ version: -1 })
      .lean();

    // Deadline and overdue telemetry
    const deadlineDate = assignment.deadline || (assignment.projectId && assignment.projectId.deadline);
    const now = new Date();
    const isOverdue = deadlineDate ? now > new Date(deadlineDate) : false;
    const diffMs = deadlineDate ? new Date(deadlineDate) - now : 0;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    res.render('freelancer/assignment-workspace', {
      title: `Workspace: ${assignment.projectId ? assignment.projectId.title : 'Assignment'} | PHOENIX`,
      activePage: 'assignments',
      assignment,
      deliverables,
      deadlineDate,
      isOverdue,
      daysRemaining
    });
  } catch (error) {
    console.error('[Freelancer Workspace Error]:', error);
    req.flash('error_msg', 'Failed to load assignment workspace.');
    res.redirect('/freelancer/assignments');
  }
};

/**
 * Freelancer Updates Project Progress Telemetry (0–100%)
 * POST /freelancer/assignments/:id/progress
 */
const updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.session.userId;
    const { progress } = req.body;

    const numProgress = parseInt(progress, 10);
    if (isNaN(numProgress) || numProgress < 0 || numProgress > 100) {
      req.flash('error_msg', 'Progress must be a whole number between 0 and 100.');
      return res.redirect(`/freelancer/assignments/${id}`);
    }

    const assignment = await Assignment.findOne({ _id: id, freelancerId });
    if (!assignment) {
      req.flash('error_msg', 'Assignment not found or access denied.');
      return res.redirect('/freelancer/assignments');
    }

    assignment.progress = numProgress;

    // Transition from ASSIGNED -> IN_PROGRESS if freelancer logs progress
    if (numProgress > 0 && assignment.status === 'ASSIGNED') {
      assignment.status = 'IN_PROGRESS';
      await Project.findByIdAndUpdate(assignment.projectId, { status: 'IN_PROGRESS' });
    }

    await assignment.save();

    req.flash('success_msg', 'Progress updated.');
    res.redirect(`/freelancer/assignments/${id}`);
  } catch (error) {
    console.error('[Update Progress Error]:', error);
    req.flash('error_msg', 'Failed to update assignment progress.');
    res.redirect(`/freelancer/assignments/${req.params.id}`);
  }
};

/**
 * Render Submit Work / Deliverables Form
 * GET /freelancer/assignments/:id/submit
 */
const showSubmitWork = async (req, res) => {
  try {
    const { id } = req.params;
    const freelancerId = req.session.userId;

    const assignment = await Assignment.findOne({ _id: id, freelancerId })
      .populate('projectId')
      .lean();

    if (!assignment) {
      req.flash('error_msg', 'Assignment not found or access denied.');
      return res.redirect('/freelancer/assignments');
    }

    // Calculate next deliverable version
    const latestDeliverable = await Deliverable.findOne({ assignmentId: assignment._id })
      .sort({ version: -1 })
      .lean();

    const nextVersion = latestDeliverable ? latestDeliverable.version + 1 : 1;

    res.render('freelancer/submit-work', {
      title: `Submit Deliverable (v${nextVersion}) | PHOENIX`,
      activePage: 'assignments',
      assignment,
      nextVersion,
      latestDeliverable,
      formData: {},
      errors: {}
    });
  } catch (error) {
    console.error('[Show Submit Work Error]:', error);
    req.flash('error_msg', 'Failed to load deliverable submission form.');
    res.redirect(`/freelancer/assignments/${req.params.id}`);
  }
};

/**
 * Handle Deliverables Upload to Cloudinary & Version Creation
 * POST /freelancer/assignments/:id/submit
 */
const submitWork = async (req, res) => {
  const { id } = req.params;
  const freelancerId = req.session.userId;
  const { title, description } = req.body;

  const uploadedFilesTracking = [];

  try {
    const assignment = await Assignment.findOne({ _id: id, freelancerId });
    if (!assignment) {
      req.flash('error_msg', 'Assignment not found or access denied.');
      return res.redirect('/freelancer/assignments');
    }

    if (!title || title.trim().length < 3) {
      req.flash('error_msg', 'Submission title must be at least 3 characters long.');
      return res.redirect(`/freelancer/assignments/${id}/submit`);
    }

    if (!req.files || req.files.length === 0) {
      req.flash('error_msg', 'Please select at least one file (ZIP, PDF, DOCX, Images, MP4) to submit.');
      return res.redirect(`/freelancer/assignments/${id}/submit`);
    }

    // Calculate incrementing version
    const latestDeliverable = await Deliverable.findOne({ assignmentId: assignment._id }).sort({ version: -1 });
    const nextVersion = latestDeliverable ? latestDeliverable.version + 1 : 1;

    // Upload each buffer stream to Cloudinary
    for (const file of req.files) {
      const uploadResult = await uploadBufferToCloudinary(
        file.buffer,
        file.originalname,
        file.mimetype,
        `phoenix/deliverables/project_${assignment.projectId}`
      );
      uploadedFilesTracking.push(uploadResult);
    }

    // Save Deliverable document
    await Deliverable.create({
      projectId: assignment.projectId,
      assignmentId: assignment._id,
      uploadedBy: freelancerId,
      title: title.trim(),
      description: description ? description.trim() : '',
      files: uploadedFilesTracking,
      version: nextVersion,
      status: 'SUBMITTED',
      submittedAt: new Date()
    });

    // Update Assignment and Project status to SUBMITTED
    assignment.status = 'SUBMITTED';
    await assignment.save();

    await Project.findByIdAndUpdate(assignment.projectId, { status: 'SUBMITTED' });

    req.flash('success_msg', 'Work submitted successfully.');
    res.redirect(`/freelancer/assignments/${id}`);
  } catch (error) {
    console.error('[Submit Work Error]:', error);

    // Rollback: Clean up any Cloudinary files uploaded in this attempt
    for (const uploaded of uploadedFilesTracking) {
      await deleteFromCloudinary(uploaded.publicId);
    }

    req.flash('error_msg', error.message || 'File upload failed. Please try again.');
    res.redirect(`/freelancer/assignments/${id}/submit`);
  }
};

/**
 * ============================================================================
 * ADMIN ASSIGNMENT & DELIVERABLE REVIEW CONTROLLER METHODS
 * ============================================================================
 */

/**
 * Admin Assignment Workspace (Inspect Deliverables, Telemetry, and Review)
 * GET /admin/assignments/:id
 */
const adminAssignmentWorkspace = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id)
      .populate({
        path: 'projectId',
        populate: [{ path: 'requiredSkills' }, { path: 'createdBy', select: 'name email' }]
      })
      .populate('freelancerId', 'name email')
      .populate('assignedBy', 'name email')
      .lean();

    if (!assignment) {
      req.flash('error_msg', 'Assignment record not found.');
      return res.redirect('/admin/assignments');
    }

    // Freelancer academic & skill profile
    const profile = await FreelancerProfile.findOne({ userId: assignment.freelancerId._id })
      .populate('skills')
      .lean();

    // Submission history
    const deliverables = await Deliverable.find({ assignmentId: assignment._id })
      .populate('reviewedBy', 'name email')
      .sort({ version: -1 })
      .lean();

    // Deadline and overdue telemetry
    const deadlineDate = assignment.deadline || (assignment.projectId && assignment.projectId.deadline);
    const now = new Date();
    const isOverdue = deadlineDate ? now > new Date(deadlineDate) : false;
    const diffMs = deadlineDate ? new Date(deadlineDate) - now : 0;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    res.render('admin/assignment-workspace', {
      title: `Assignment Review: ${assignment.projectId ? assignment.projectId.title : ''} | PHOENIX Admin`,
      activePage: 'assignments',
      assignment,
      profile,
      deliverables,
      deadlineDate,
      isOverdue,
      daysRemaining
    });
  } catch (error) {
    console.error('[Admin Assignment Workspace Error]:', error);
    req.flash('error_msg', 'Failed to load assignment workspace.');
    res.redirect('/admin/assignments');
  }
};

/**
 * Admin Approves Deliverable Submission -> Completes Project
 * POST /admin/deliverables/:id/approve
 */
const approveDeliverable = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.session.userId;

    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      req.flash('error_msg', 'Deliverable submission not found.');
      return res.redirect('/admin/assignments');
    }

    deliverable.status = 'APPROVED';
    deliverable.reviewedAt = new Date();
    deliverable.reviewedBy = adminId;
    await deliverable.save();

    // Update Assignment: status -> COMPLETED, progress -> 100
    await Assignment.findByIdAndUpdate(deliverable.assignmentId, {
      status: 'COMPLETED',
      progress: 100
    });

    // Update Project: status -> COMPLETED
    await Project.findByIdAndUpdate(deliverable.projectId, {
      status: 'COMPLETED'
    });

    req.flash('success_msg', 'Submission approved. Project marked as completed.');
    res.redirect(`/admin/assignments/${deliverable.assignmentId}`);
  } catch (error) {
    console.error('[Approve Deliverable Error]:', error);
    req.flash('error_msg', 'Failed to approve deliverable.');
    res.redirect('/admin/assignments');
  }
};

/**
 * Admin Requests Revision on Deliverable Submission
 * POST /admin/deliverables/:id/revision
 */
const requestRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.session.userId;
    const { feedback } = req.body;

    if (!feedback || feedback.trim().length === 0) {
      req.flash('error_msg', 'Review feedback is required when requesting a revision.');
      const deliverable = await Deliverable.findById(id);
      return res.redirect(`/admin/assignments/${deliverable ? deliverable.assignmentId : ''}`);
    }

    const deliverable = await Deliverable.findById(id);
    if (!deliverable) {
      req.flash('error_msg', 'Deliverable submission not found.');
      return res.redirect('/admin/assignments');
    }

    deliverable.status = 'REVISION_REQUIRED';
    deliverable.reviewFeedback = feedback.trim();
    deliverable.reviewedAt = new Date();
    deliverable.reviewedBy = adminId;
    await deliverable.save();

    // Update Assignment: status -> REVISION_REQUIRED
    await Assignment.findByIdAndUpdate(deliverable.assignmentId, {
      status: 'REVISION_REQUIRED'
    });

    // Update Project: status -> REVISION_REQUIRED
    await Project.findByIdAndUpdate(deliverable.projectId, {
      status: 'REVISION_REQUIRED'
    });

    req.flash('warning_msg', 'Revision requested.');
    res.redirect(`/admin/assignments/${deliverable.assignmentId}`);
  } catch (error) {
    console.error('[Request Revision Error]:', error);
    req.flash('error_msg', 'Failed to submit revision request.');
    res.redirect('/admin/assignments');
  }
};

module.exports = {
  freelancerWorkspace,
  updateProgress,
  showSubmitWork,
  submitWork,
  adminAssignmentWorkspace,
  approveDeliverable,
  requestRevision
};
