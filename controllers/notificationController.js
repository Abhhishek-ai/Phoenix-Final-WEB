const Notification = require('../models/Notification');

/**
 * List all notifications for logged-in user
 * GET /notifications
 */
const notificationList = async (req, res) => {
  try {
    const userId = req.session.userId;
    const notifications = await Notification.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.render('shared/notifications', {
      title: 'Notifications | PHOENIX',
      activePage: 'notifications',
      notifications
    });
  } catch (error) {
    console.error('[Notification List Error]:', error);
    req.flash('error_msg', 'Failed to load notifications.');
    res.redirect('/');
  }
};

/**
 * Mark a single notification as read
 * POST /notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.userId;

    const notif = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true });
    }

    if (notif && notif.link) {
      return res.redirect(notif.link);
    }

    res.redirect('/notifications');
  } catch (error) {
    console.error('[Mark As Read Error]:', error);
    res.redirect('/notifications');
  }
};

/**
 * Mark all notifications as read for logged in user
 * POST /notifications/read-all
 */
const markAllRead = async (req, res) => {
  try {
    const userId = req.session.userId;
    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });

    req.flash('success_msg', 'All notifications marked as read.');
    res.redirect('/notifications');
  } catch (error) {
    console.error('[Mark All Read Error]:', error);
    req.flash('error_msg', 'Failed to update notifications.');
    res.redirect('/notifications');
  }
};

/**
 * API: Get unread count
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.json({ count: 0 });
    }
    const count = await Notification.countDocuments({
      recipientId: req.session.userId,
      isRead: false
    });
    res.json({ count });
  } catch (error) {
    res.json({ count: 0 });
  }
};

module.exports = {
  notificationList,
  markAsRead,
  markAllRead,
  getUnreadCount
};
