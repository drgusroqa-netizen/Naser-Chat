const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { uploadSingle, handleUploadError } = require('../middleware/upload');

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('اسم المستخدم يجب أن يكون بين 3 و20 حرف')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('اسم المستخدم يجب أن يحتوي فقط على أحرف إنجليزية وأرقام وشرطات سفلية'),
  
  body('email')
    .isEmail()
    .withMessage('بريد إلكتروني غير صحيح')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('اسم العرض يجب أن لا يتجاوز 30 حرف')
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('بريد إلكتروني غير صحيح'),
  
  body('password')
    .notEmpty()
    .withMessage('كلمة المرور مطلوبة')
];

// Public routes
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/verify', authController.verifyToken);

// Protected routes
router.use(protect);

router.get('/me', authController.getMe);
router.put('/profile', 
  uploadSingle('avatar'),
  handleUploadError,
  authController.updateProfile
);
router.put('/password', authController.changePassword);
router.post('/logout', authController.logout);

module.exports = router;
