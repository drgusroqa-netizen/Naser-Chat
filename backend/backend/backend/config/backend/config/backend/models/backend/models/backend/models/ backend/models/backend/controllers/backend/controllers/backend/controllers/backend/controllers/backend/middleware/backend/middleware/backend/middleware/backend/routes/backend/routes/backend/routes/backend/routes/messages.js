const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect, checkServerMember } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Message routes
router.post('/channel/:channelId', checkServerMember, messageController.sendMessage);
router.get('/channel/:channelId', checkServerMember, messageController.getMessages);
router.get('/channel/:channelId/pinned', checkServerMember, messageController.getPinnedMessages);
router.get('/search', checkServerMember, messageController.searchMessages);

// Message-specific routes
router.put('/:id', checkServerMember, messageController.editMessage);
router.delete('/:id', checkServerMember, messageController.deleteMessage);
router.post('/:id/pin', checkServerMember, messageController.pinMessage);
router.post('/:id/unpin', checkServerMember, messageController.unpinMessage);
router.post('/:id/reactions', checkServerMember, messageController.addReaction);
router.delete('/:id/reactions', checkServerMember, messageController.removeReaction);

module.exports = router;
