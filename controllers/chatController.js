const Message = require('../models/Message');
const Assignment = require('../models/Assignment');
const Project = require('../models/Project');
const User = require('../models/User');
const { sendNotification } = require('../services/notificationService');

/**
 * Render Assignment-based Chat Workspace
 * GET /assignments/:id/chat
 */
const showChatWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.session.userId;
    const currentUserRole = req.user ? req.user.role : '';

    const assignment = await Assignment.findById(id)
      .populate('projectId')
      .populate('freelancerId', 'name email')
      .populate('assignedBy', 'name email')
      .lean();

    if (!assignment) {
      req.flash('error_msg', 'Assignment not found.');
      return res.redirect(currentUserRole === 'ADMIN' ? '/admin/assignments' : '/freelancer/assignments');
    }

    // Security check: Must be the assigned freelancer or an admin
    const isFreelancer = assignment.freelancerId._id.toString() === currentUserId;
    const isAdmin = currentUserRole === 'ADMIN';

    if (!isFreelancer && !isAdmin) {
      req.flash('error_msg', 'Access denied to this project conversation.');
      return res.redirect('/');
    }

    const conversationId = assignment._id.toString();

    // Fetch existing messages
    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name email role')
      .sort({ createdAt: 1 })
      .lean();

    // Determine other party
    const chatPartner = isFreelancer ? assignment.assignedBy : assignment.freelancerId;

    res.render('shared/chat-workspace', {
      title: `Chat: ${assignment.projectId.title} | PHOENIX`,
      activePage: 'messages',
      assignment,
      messages,
      chatPartner,
      conversationId
    });
  } catch (error) {
    console.error('[Show Chat Workspace Error]:', error);
    req.flash('error_msg', 'Failed to load project conversation.');
    res.redirect('/');
  }
};

/**
 * API: Get Message History
 * GET /api/chat/:assignmentId/messages
 */
const fetchMessagesAPI = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const conversationId = assignmentId;

    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name email role')
      .sort({ createdAt: 1 })
      .lean();

    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * API: Send Message & Emit Socket Event
 * POST /api/chat/:assignmentId/messages
 */
const sendMessageAPI = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const senderId = req.session.userId;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty.' });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found.' });
    }

    const isSenderFreelancer = assignment.freelancerId.toString() === senderId;
    const receiverId = isSenderFreelancer ? assignment.assignedBy : assignment.freelancerId;

    const newMsg = await Message.create({
      conversationId: assignment._id.toString(),
      projectId: assignment.projectId,
      senderId,
      receiverId,
      message: message.trim(),
      isRead: false
    });

    const populatedMsg = await Message.findById(newMsg._id)
      .populate('senderId', 'name email role')
      .lean();

    // Broadcast message via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.to(`assignment_${assignment._id.toString()}`).emit('new_message', populatedMsg);
    }

    // Send in-app notification to receiver
    await sendNotification(
      receiverId,
      'NEW_MESSAGE',
      `New Message from ${req.user.name}`,
      message.trim().substring(0, 100),
      `/assignments/${assignment._id}/chat`
    );

    res.json({ success: true, message: populatedMsg });
  } catch (error) {
    console.error('[Send Message API Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  showChatWorkspace,
  fetchMessagesAPI,
  sendMessageAPI
};
