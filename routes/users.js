const express = require('express');
const User = require('../models/User');
const { authenticateToken, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/users - Create new user (admin only)
router.post('/', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role = 'viewer', status = 'active' } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for user creation.',
        error: 'MISSING_REQUIRED_FIELDS',
        required: ['name', 'email', 'password'],
        provided: { name: !!name, email: !!email, password: !!password }
      });
    }

    // Validate name
    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long.',
        error: 'INVALID_NAME_LENGTH'
      });
    }

    if (name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot exceed 50 characters.',
        error: 'NAME_TOO_LONG'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
        error: 'INVALID_EMAIL_FORMAT'
      });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
        error: 'PASSWORD_TOO_SHORT'
      });
    }

    // Validate role
    if (!['admin', 'analyst', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified. Must be one of: admin, analyst, viewer.',
        error: 'INVALID_ROLE',
        validRoles: ['admin', 'analyst', 'viewer'],
        provided: role
      });
    }

    // Validate status
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status specified. Must be either active or inactive.',
        error: 'INVALID_STATUS',
        validStatuses: ['active', 'inactive'],
        provided: status
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists.',
        error: 'EMAIL_ALREADY_EXISTS',
        email: email.toLowerCase().trim(),
        suggestion: 'Please use a different email address or check if the user already exists.'
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: User.hashPassword(password),
      role,
      status
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: {
        user,
        createdBy: req.user.email
      },
      metadata: {
        timestamp: new Date().toISOString(),
        userId: user._id.toString()
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error occurred while creating user.',
        error: 'VALIDATION_ERROR',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A user with this information already exists.',
        error: 'DUPLICATE_ENTRY',
        suggestion: 'Please check the provided information and try again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create user due to an unexpected error.',
      error: 'USER_CREATION_FAILED',
      suggestion: 'Please try again later or contact support if the problem persists.'
    });
  }
});

// GET /api/users - Get all users (admin only)
router.get('/', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: users.length,
          totalUsers: total
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/users/:id - Get specific user (admin only)
router.get('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PATCH /api/users/:id - Update user role/status (admin only)
router.patch('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { role, status } = req.body;
    const updates = {};

    // Validate and add role to updates
    if (role !== undefined) {
      if (!['admin', 'analyst', 'viewer'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be admin, analyst, or viewer'
        });
      }
      updates.role = role;
    }

    // Validate and add status to updates
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be active or inactive'
        });
      }
      updates.status = status;
    }

    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field (role or status) must be provided for update'
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === req.params.id && status === 'inactive') {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
