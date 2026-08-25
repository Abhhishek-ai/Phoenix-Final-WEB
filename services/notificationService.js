const Notification = require('../models/Notification');

/**
 * Dispatches an in-app notification to a user
 * @param {string|ObjectId} recipientId - Target User ID
 * @param {string} type - Notification Type Enum
 * @param {string} title - Brief Title
 * @param {string} message - Informative message
 * @param {string} [link=''] - Clickable redirect destination
 * @param {string|ObjectId} [projectId=null] - Associated Project ID
 */
const sendNotification = async (recipientId, type, title, message, link = '', projectId = null) => {
  try {
    if (!recipientId) return null;

    const notification = await Notification.create({
      recipientId,
      type,
      title,
      message,
      link,
      projectId: projectId || undefined,
      isRead: false
    });

    return notification;
  } catch (error) {
    console.error('[Notification Service Error] Failed to create notification:', error.message);
    return null;
  }
};

module.exports = {
  sendNotification
};
