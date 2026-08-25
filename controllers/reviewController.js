const Assignment = require('../models/Assignment');
const Project = require('../models/Project');
const Review = require('../models/Review');
const FreelancerProfile = require('../models/FreelancerProfile');
const { sendNotification } = require('../services/notificationService');

/**
 * Render Review Submission Page for a Completed Assignment
 * GET /admin/assignments/:id/review
 */
const showReviewForm = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findById(id)
      .populate('projectId')
      .populate('freelancerId', 'name email')
      .lean();

    if (!assignment) {
      req.flash('error_msg', 'Assignment not found.');
      return res.redirect('/admin/assignments');
    }

    const existingReview = await Review.findOne({
      projectId: assignment.projectId._id,
      freelancerId: assignment.freelancerId._id
    }).lean();

    res.render('admin/review-assignment', {
      title: `Review Student: ${assignment.freelancerId.name} | PHOENIX Admin`,
      activePage: 'assignments',
      assignment,
      existingReview
    });
  } catch (error) {
    console.error('[Show Review Form Error]:', error);
    req.flash('error_msg', 'Failed to load review form.');
    res.redirect('/admin/assignments');
  }
};

/**
 * Handle Review & Rating Submission & Aggregate Profile Score
 * POST /admin/assignments/:id/review
 */
const submitReview = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.session.userId;
    const { rating, comment } = req.body;

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      req.flash('error_msg', 'Please provide a valid rating between 1 and 5 stars.');
      return res.redirect(`/admin/assignments/${id}/review`);
    }

    const assignment = await Assignment.findById(id).populate('projectId');
    if (!assignment) {
      req.flash('error_msg', 'Assignment not found.');
      return res.redirect('/admin/assignments');
    }

    const freelancerId = assignment.freelancerId;

    // Create or update review
    await Review.findOneAndUpdate(
      { projectId: assignment.projectId._id, freelancerId },
      {
        projectId: assignment.projectId._id,
        freelancerId,
        reviewerId: adminId,
        rating: numRating,
        comment: comment ? comment.trim() : ''
      },
      { upsert: true, new: true }
    );

    // Aggregate average rating across all reviews for this student
    const allReviews = await Review.find({ freelancerId });
    const avgRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0) / allReviews.length;
    const completedAssignmentsCount = await Assignment.countDocuments({
      freelancerId,
      status: 'COMPLETED'
    });

    await FreelancerProfile.findOneAndUpdate(
      { userId: freelancerId },
      {
        rating: Math.round(avgRating * 10) / 10,
        completedProjects: completedAssignmentsCount
      }
    );

    // Send in-app notification
    await sendNotification(
      freelancerId,
      'NEW_REVIEW',
      'New Performance Rating Received! ⭐',
      `You were rated ${numRating} / 5 stars for your work on "${assignment.projectId.title}".`,
      `/freelancer/assignments/${assignment._id}`
    );

    req.flash('success_msg', 'Review and rating submitted successfully.');
    res.redirect(`/admin/assignments/${id}`);
  } catch (error) {
    console.error('[Submit Review Error]:', error);
    req.flash('error_msg', 'Failed to submit review.');
    res.redirect(`/admin/assignments/${req.params.id}`);
  }
};

module.exports = {
  showReviewForm,
  submitReview
};
