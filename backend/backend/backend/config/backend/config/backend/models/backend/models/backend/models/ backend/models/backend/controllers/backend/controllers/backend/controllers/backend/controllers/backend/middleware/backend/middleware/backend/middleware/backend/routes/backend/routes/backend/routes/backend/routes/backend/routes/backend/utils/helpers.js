const crypto = require('crypto');

// Generate random string
exports.generateRandomString = (length = 10) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate invite code
exports.generateInviteCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};

// Format date
exports.formatDate = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) {
    return 'الآن';
  } else if (diffMins < 60) {
    return `منذ ${diffMins} دقيقة`;
  } else if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`;
  } else if (diffDays < 7) {
    return `منذ ${diffDays} يوم`;
  } else {
    return new Date(date).toLocaleDateString('ar-SA');
  }
};

// Truncate text
exports.truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// Validate email
exports.isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate username
exports.isValidUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

// Sanitize input
exports.sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags
  input = input.replace(/<[^>]*>/g, '');
  
  // Escape special characters
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  const reg = /[&<>"'/]/ig;
  return input.replace(reg, (match) => map[match]);
};

// Get file extension
exports.getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

// Check if file is image
exports.isImageFile = (filename) => {
  const ext = this.getFileExtension(filename);
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
  return imageExtensions.includes(ext);
};

// Check if file is video
exports.isVideoFile = (filename) => {
  const ext = this.getFileExtension(filename);
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv'];
  return videoExtensions.includes(ext);
};

// Check if file is audio
exports.isAudioFile = (filename) => {
  const ext = this.getFileExtension(filename);
  const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
  return audioExtensions.includes(ext);
};

// Calculate file size
exports.formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Generate color from string (for avatars)
exports.stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
    '#118AB2', '#073B4C', '#7209B7', '#F72585',
    '#3A86FF', '#FB5607', '#8338EC', '#FF006E'
  ];
  
  return colors[Math.abs(hash) % colors.length];
};
