const express = require('express');
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/assignments/:id/chat', requireAuth, chatController.showChatWorkspace);
router.get('/api/chat/:assignmentId/messages', requireAuth, chatController.fetchMessagesAPI);
router.post('/api/chat/:assignmentId/messages', requireAuth, chatController.sendMessageAPI);

module.exports = router;
