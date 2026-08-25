const express = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/notifications', requireAuth, notificationController.notificationList);
router.post('/notifications/:id/read', requireAuth, notificationController.markAsRead);
router.post('/notifications/read-all', requireAuth, notificationController.markAllRead);
router.get('/api/notifications/unread-count', notificationController.getUnreadCount);

module.exports = router;
