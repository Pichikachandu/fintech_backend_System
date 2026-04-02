const { body, param, query, validationResult } = require('express-validator');

// Custom validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please check your input.',
      error: 'VALIDATION_ERROR',
      errors: errorMessages,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.id || 'unknown'
      }
    });
  }
  next();
};

// Common validation rules
const validationRules = {
  // User validations
  user: {
    create: [
      body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
      
      body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email cannot exceed 100 characters'),
      
      body('password')
        .isLength({ min: 6, max: 128 })
        .withMessage('Password must be between 6 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
      
      body('role')
        .optional()
        .isIn(['admin', 'analyst', 'viewer'])
        .withMessage('Role must be one of: admin, analyst, viewer'),
      
      body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Status must be either active or inactive')
    ],

    update: [
      body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
      
      body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email cannot exceed 100 characters'),
      
      body('role')
        .optional()
        .isIn(['admin', 'analyst', 'viewer'])
        .withMessage('Role must be one of: admin, analyst, viewer'),
      
      body('status')
        .optional()
        .isIn(['active', 'inactive'])
        .withMessage('Status must be either active or inactive')
    ]
  },

  // Record validations
  record: {
    create: [
      body('amount')
        .isFloat({ gt: 0 })
        .withMessage('Amount must be a positive number greater than 0')
        .custom((value) => {
          if (value > 999999999.99) {
            throw new Error('Amount cannot exceed 999,999,999.99');
          }
          return true;
        }),
      
      body('type')
        .isIn(['income', 'expense'])
        .withMessage('Type must be either income or expense')
        .toLowerCase(),
      
      body('category')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Category must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s&-]+$/)
        .withMessage('Category can only contain letters, spaces, ampersands, and hyphens'),
      
      body('date')
        .isISO8601()
        .withMessage('Date must be a valid date in ISO format')
        .custom((value) => {
          const date = new Date(value);
          const now = new Date();
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          
          if (date > now) {
            throw new Error('Date cannot be in the future');
          }
          if (date < oneYearAgo) {
            throw new Error('Date cannot be more than 1 year in the past');
          }
          return true;
        }),
      
      body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
    ],

    update: [
      body('amount')
        .optional()
        .isFloat({ gt: 0 })
        .withMessage('Amount must be a positive number greater than 0')
        .custom((value) => {
          if (value > 999999999.99) {
            throw new Error('Amount cannot exceed 999,999,999.99');
          }
          return true;
        }),
      
      body('type')
        .optional()
        .isIn(['income', 'expense'])
        .withMessage('Type must be either income or expense')
        .toLowerCase(),
      
      body('category')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Category must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s&-]+$/)
        .withMessage('Category can only contain letters, spaces, ampersands, and hyphens'),
      
      body('date')
        .optional()
        .isISO8601()
        .withMessage('Date must be a valid date in ISO format')
        .custom((value) => {
          const date = new Date(value);
          const now = new Date();
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          
          if (date > now) {
            throw new Error('Date cannot be in the future');
          }
          if (date < oneYearAgo) {
            throw new Error('Date cannot be more than 1 year in the past');
          }
          return true;
        }),
      
      body('notes')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notes cannot exceed 500 characters')
    ]
  },

  // Dashboard query validations
  dashboard: {
    summary: [
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date in ISO format'),
      
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date in ISO format')
        .custom((value, { req }) => {
          if (req.query.startDate && value) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(value);
            
            if (endDate <= startDate) {
              throw new Error('End date must be after start date');
            }
            
            const maxDateRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
            if (endDate - startDate > maxDateRange) {
              throw new Error('Date range cannot exceed 1 year');
            }
          }
          return true;
        })
    ],

    category: [
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date in ISO format'),
      
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date in ISO format')
        .custom((value, { req }) => {
          if (req.query.startDate && value) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(value);
            
            if (endDate <= startDate) {
              throw new Error('End date must be after start date');
            }
          }
          return true;
        }),
      
      query('type')
        .optional()
        .isIn(['income', 'expense'])
        .withMessage('Type must be either income or expense')
    ],

    trends: [
      query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid date in ISO format'),
      
      query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid date in ISO format')
        .custom((value, { req }) => {
          if (req.query.startDate && value) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(value);
            
            if (endDate <= startDate) {
              throw new Error('End date must be after start date');
            }
          }
          return true;
        }),
      
      query('months')
        .optional()
        .isInt({ min: 1, max: 24 })
        .withMessage('Months must be between 1 and 24')
    ],

    recent: [
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
      
      query('type')
        .optional()
        .isIn(['income', 'expense'])
        .withMessage('Type must be either income or expense')
    ]
  },

  // Common parameter validations
  params: {
    mongoId: [
      param('id')
        .isMongoId()
        .withMessage('Invalid ID format')
    ],

    pagination: [
      query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
    ]
  },

  // Authentication validations
  auth: {
    login: [
      body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
      
      body('password')
        .isLength({ min: 1 })
        .withMessage('Password is required')
    ]
  }
};

// Custom validation middleware
const validate = (rules) => {
  return [
    ...rules,
    handleValidationErrors
  ];
};

// Sanitization helpers
const sanitizeInput = (req, res, next) => {
  // Trim string fields
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].trim();
      }
    });
  }
  
  next();
};

// Business logic validation helpers
const businessValidators = {
  // Check if user can perform operation on record
  canModifyRecord: async (req, res, next) => {
    try {
      const Record = require('../models/Record');
      const recordId = req.params.id;
      
      if (!recordId) {
        return next();
      }
      
      const record = await Record.findById(recordId);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found',
          error: 'RECORD_NOT_FOUND'
        });
      }
      
      // Users can only modify their own records (except admins)
      if (req.user.role !== 'admin' && record.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only modify your own records',
          error: 'ACCESS_DENIED'
        });
      }
      
      req.record = record;
      next();
    } catch (error) {
      next(error);
    }
  },

  // Check if user can view record
  canViewRecord: async (req, res, next) => {
    try {
      const Record = require('../models/Record');
      const recordId = req.params.id;
      
      if (!recordId) {
        return next();
      }
      
      const record = await Record.findById(recordId);
      if (!record) {
        return res.status(404).json({
          success: false,
          message: 'Record not found',
          error: 'RECORD_NOT_FOUND'
        });
      }
      
      // Users can only view their own records (except admins and analysts)
      if (!['admin', 'analyst'].includes(req.user.role) && 
          record.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own records',
          error: 'ACCESS_DENIED'
        });
      }
      
      req.record = record;
      next();
    } catch (error) {
      next(error);
    }
  },

  // Prevent self-deletion for users
  preventSelfDeletion: (req, res, next) => {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
        error: 'SELF_DELETION_FORBIDDEN'
      });
    }
    next();
  },

  // Prevent self-deactivation for users
  preventSelfDeactivation: (req, res, next) => {
    if (req.params.id === req.user._id.toString() && req.body.status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
        error: 'SELF_DEACTIVATION_FORBIDDEN'
      });
    }
    next();
  }
};

module.exports = {
  validate,
  validationRules,
  sanitizeInput,
  businessValidators,
  handleValidationErrors
};
