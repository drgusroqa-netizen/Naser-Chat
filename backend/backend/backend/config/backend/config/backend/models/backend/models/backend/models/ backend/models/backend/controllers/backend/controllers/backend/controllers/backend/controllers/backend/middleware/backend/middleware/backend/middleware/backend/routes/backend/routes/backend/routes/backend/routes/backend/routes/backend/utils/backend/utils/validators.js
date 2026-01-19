const { body, param, query } = require('express-validator');

// User validators
exports.registerValidator = [
  body('username')
    .notEmpty().withMessage('اسم المستخدم مطلوب')
    .isLength({ min: 3, max: 20 }).withMessage('اسم المستخدم يجب أن يكون بين 3 و20 حرف')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('اسم المستخدم يجب أن يحتوي فقط على أحرف إنجليزية وأرقام وشرطات سفلية'),
  
  body('email')
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('بريد إلكتروني غير صحيح')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
    .isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('اسم العرض يجب أن لا يتجاوز 30 حرف')
];

exports.loginValidator = [
  body('email')
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('بريد إلكتروني غير صحيح'),
  
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
];

// Server validators
exports.serverValidator = [
  body('name')
    .notEmpty().withMessage('اسم الخادم مطلوب')
    .isLength({ max: 100 }).withMessage('اسم الخادم يجب أن لا يتجاوز 100 حرف')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('وصف الخادم يجب أن لا يتجاوز 500 حرف')
    .trim()
];

// Channel validators
exports.channelValidator = [
  body('name')
    .notEmpty().withMessage('اسم القناة مطلوب')
    .isLength({ max: 100 }).withMessage('اسم القناة يجب أن لا يتجاوز 100 حرف')
    .trim(),
  
  body('type')
    .notEmpty().withMessage('نوع القناة مطلوب')
    .isIn(['text', 'voice', 'announcement', 'category']).withMessage('نوع القناة غير صحيح'),
  
  body('category')
    .optional()
    .isLength({ max: 50 }).withMessage('اسم الفئة يجب أن لا يتجاوز 50 حرف')
    .trim(),
  
  body('topic')
    .optional()
    .isLength({ max: 1000 }).withMessage('موضوع القناة يجب أن لا يتجاوز 1000 حرف')
    .trim(),
  
  body('isPrivate')
    .optional()
    .isBoolean().withMessage('يجب أن تكون قيمة خاصة/عامة منطقية'),
  
  body('slowmode.delay')
    .optional()
    .isInt({ min: 0, max: 21600 }).withMessage('تأثير الإرسال يجب أن يكون بين 0 و21600 ثانية')
];

// Message validators
exports.messageValidator = [
  body('content')
    .if(body('attachments').not().exists())
    .notEmpty().withMessage('محتوى الرسالة مطلوب')
    .isLength({ max: 2000 }).withMessage('الرسالة يجب أن لا تتجاوز 2000 حرف')
    .trim(),
  
  body('attachments')
    .optional()
    .isArray().withMessage('المرفقات يجب أن تكون مصفوفة'),
  
  body('attachments.*.url')
    .if(body('attachments').exists())
    .notEmpty().withMessage('رابط الملف مطلوب')
    .isURL().withMessage('رابط غير صحيح'),
  
  body('attachments.*.filename')
    .if(body('attachments').exists())
    .notEmpty().withMessage('اسم الملف مطلوب'),
  
  body('attachments.*.filetype')
    .if(body('attachments').exists())
    .notEmpty().withMessage('نوع الملف مطلوب'),
  
  body('attachments.*.size')
    .if(body('attachments').exists())
    .isInt({ min: 1 }).withMessage('حجم الملف يجب أن يكون رقم موجب')
];

// ID validators
exports.idValidator = [
  param('id')
    .notEmpty().withMessage('المعرف مطلوب')
    .isMongoId().withMessage('معرف غير صحيح')
];

exports.channelIdValidator = [
  param('channelId')
    .notEmpty().withMessage('معرف القناة مطلوب')
    .isMongoId().withMessage('معرف القناة غير صحيح')
];

exports.serverIdValidator = [
  param('serverId')
    .notEmpty().withMessage('معرف الخادم مطلوب')
    .isMongoId().withMessage('معرف الخادم غير صحيح')
];

// Query validators
exports.paginationValidator = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('الحد يجب أن يكون بين 1 و100')
    .toInt(),
  
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('الصفحة يجب أن تكون رقم موجب')
    .toInt(),
  
  query('before')
    .optional()
    .isISO8601().withMessage('تاريخ غير صحيح')
];

// Search validator
exports.searchValidator = [
  query('query')
    .notEmpty().withMessage('كلمة البحث مطلوبة')
    .isLength({ min: 1, max: 100 }).withMessage('كلمة البحث يجب أن تكون بين 1 و100 حرف')
    .trim()
];

// File validators
exports.fileValidator = [
  body().custom((value, { req }) => {
    if (!req.file) {
      throw new Error('الملف مطلوب');
    }
    
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new Error('نوع الملف غير مسموح به');
    }
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (req.file.size > maxSize) {
      throw new Error('حجم الملف كبير جداً (الحد الأقصى 5MB)');
    }
    
    return true;
  })
];
