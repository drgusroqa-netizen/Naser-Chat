const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const { protect, checkServerMember, checkServerAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Channel routes
router.post('/server/:serverId', checkServerAdmin, channelController.createChannel);
router.get('/server/:serverId', checkServerMember, channelController.getServerChannels);
router.put('/reorder', checkServerAdmin, channelController.updateChannelPosition);

// Channel-specific routes
router.get('/:id', checkServerMember, channelController.getChannel);
router.put('/:id', checkServerAdmin, channelController.updateChannel);
router.delete('/:id', checkServerAdmin, channelController.deleteChannel);

// Private channel management
router.post('/:id/users', checkServerAdmin, channelController.addUserToChannel);
router.delete('/:id/users', checkServerAdmin, channelController.removeUserFromChannel);

module.exports = router;
