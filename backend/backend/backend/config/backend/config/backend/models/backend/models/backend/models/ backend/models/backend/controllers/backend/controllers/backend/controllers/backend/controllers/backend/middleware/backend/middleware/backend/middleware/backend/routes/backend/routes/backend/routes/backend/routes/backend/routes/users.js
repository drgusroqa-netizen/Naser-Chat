const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -email -friendRequests');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب بيانات المستخدم'
    });
  }
});

// Search users
router.get('/search/:query', async (req, res) => {
  try {
    const query = req.params.query;
    
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } }
      ],
      _id: { $ne: req.user.id } // Exclude current user
    })
    .select('username displayName avatar status')
    .limit(20);
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في البحث'
    });
  }
});

// Send friend request
router.post('/:id/friend-request', async (req, res) => {
  try {
    const targetUserId = req.params.id;
    
    if (targetUserId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'لا يمكنك إرسال طلب صداقة لنفسك'
      });
    }
    
    const targetUser = await User.findById(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود'
      });
    }
    
    // Check if already friends
    if (req.user.friends.includes(targetUserId)) {
      return res.status(400).json({
        success: false,
        error: 'أنتم أصدقاء بالفعل'
      });
    }
    
    // Check if request already sent
    const existingRequest = targetUser.friendRequests.find(
      request => request.from.toString() === req.user.id.toString()
    );
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'تم إرسال طلب الصداقة مسبقاً'
      });
    }
    
    // Add friend request
    targetUser.friendRequests.push({
      from: req.user.id,
      status: 'pending'
    });
    
    await targetUser.save();
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`user_${targetUserId}`).emit('friend_request_received', {
      from: req.user.id,
      fromName: req.user.displayName || req.user.username
    });
    
    res.json({
      success: true,
      message: 'تم إرسال طلب الصداقة بنجاح'
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في إرسال طلب الصداقة'
    });
  }
});

// Get friend requests
router.get('/friend-requests/incoming', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friendRequests.from', 'username displayName avatar');
    
    const incomingRequests = user.friendRequests.filter(
      request => request.status === 'pending'
    );
    
    res.json({
      success: true,
      requests: incomingRequests
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب طلبات الصداقة'
    });
  }
});

// Accept friend request
router.post('/friend-requests/:requestId/accept', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const requestId = req.params.requestId;
    
    // Find the request
    const requestIndex = user.friendRequests.findIndex(
      request => request._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'طلب الصداقة غير موجود'
      });
    }
    
    const request = user.friendRequests[requestIndex];
    
    // Update request status
    user.friendRequests[requestIndex].status = 'accepted';
    
    // Add to friends list for both users
    user.friends.push(request.from);
    
    const otherUser = await User.findById(request.from);
    otherUser.friends.push(req.user.id);
    
    // Remove the request from other user's list
    otherUser.friendRequests = otherUser.friendRequests.filter(
      req => req.from.toString() !== req.user.id.toString()
    );
    
    await Promise.all([user.save(), otherUser.save()]);
    
    // Emit socket events
    const io = req.app.get('io');
    io.to(`user_${request.from}`).emit('friend_request_accepted', {
      by: req.user.id,
      byName: req.user.displayName || req.user.username
    });
    
    res.json({
      success: true,
      message: 'تم قبول طلب الصداقة'
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في قبول طلب الصداقة'
    });
  }
});

// Reject friend request
router.post('/friend-requests/:requestId/reject', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const requestId = req.params.requestId;
    
    // Find the request
    const requestIndex = user.friendRequests.findIndex(
      request => request._id.toString() === requestId
    );
    
    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'طلب الصداقة غير موجود'
      });
    }
    
    const request = user.friendRequests[requestIndex];
    
    // Update request status
    user.friendRequests[requestIndex].status = 'rejected';
    
    await user.save();
    
    res.json({
      success: true,
      message: 'تم رفض طلب الصداقة'
    });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في رفض طلب الصداقة'
    });
  }
});

// Get friends list
router.get('/friends/list', async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username displayName avatar status bio lastSeen');
    
    res.json({
      success: true,
      friends: user.friends
    });
  } catch (error) {
    console.error('Get friends list error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب قائمة الأصدقاء'
    });
  }
});

// Remove friend
router.delete('/friends/:friendId', async (req, res) => {
  try {
    const friendId = req.params.friendId;
    
    // Remove from current user's friends
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { friends: friendId }
    });
    
    // Remove from other user's friends
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user.id }
    });
    
    res.json({
      success: true,
      message: 'تم إزالة الصديق بنجاح'
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في إزالة الصديق'
    });
  }
});

// Update user settings
router.put('/settings', async (req, res) => {
  try {
    const { theme, language, notifications, sound } = req.body;
    
    const updateData = {};
    
    if (theme) updateData['settings.theme'] = theme;
    if (language) updateData['settings.language'] = language;
    if (notifications !== undefined) updateData['settings.notifications'] = notifications;
    if (sound) {
      if (sound.enabled !== undefined) updateData['settings.sound.enabled'] = sound.enabled;
      if (sound.volume !== undefined) updateData['settings.sound.volume'] = sound.volume;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    );
    
    res.json({
      success: true,
      message: 'تم تحديث الإعدادات بنجاح',
      settings: user.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'حدث خطأ في تحديث الإعدادات'
    });
  }
});

module.exports = router;
