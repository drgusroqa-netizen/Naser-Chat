const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');
const { protect, checkServerMember, checkServerAdmin } = require('../middleware/auth');
const { uploadSingle, handleUploadError } = require('../middleware/upload');

// All routes require authentication
router.use(protect);

// Server routes
router.post('/', serverController.createServer);
router.get('/my', serverController.getUserServers);
router.post('/join', serverController.joinServer);

// Server-specific routes
router.get('/:id', checkServerMember, serverController.getServer);
router.put('/:id', 
  checkServerAdmin,
  uploadSingle('serverIcon'),
  handleUploadError,
  serverController.updateServer
);
router.delete('/:id', checkServerAdmin, serverController.deleteServer);
router.post('/:id/leave', checkServerMember, serverController.leaveServer);

// Member management
router.get('/:id/members', checkServerMember, serverController.getServerMembers);
router.put('/:id/members/role', checkServerAdmin, serverController.updateMemberRole);

// Invite management
router.post('/:id/invite', checkServerAdmin, serverController.generateInviteCode);

module.exports = router;
