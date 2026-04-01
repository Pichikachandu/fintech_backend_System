const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please provide a valid Bearer token in the Authorization header.',
        error: 'MISSING_TOKEN'
      });
    }

    // Check token format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format. Use: Authorization: Bearer <token>',
        error: 'INVALID_TOKEN_FORMAT'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user with password included for status check
    const user = await User.findById(decoded.id).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed. The user associated with this token no longer exists.',
        error: 'USER_NOT_FOUND'
      });
    }

    // Check if user is inactive
    if (user.status === 'inactive') {
      return res.status(403).json({ 
        success: false, 
        message: 'Account access denied. Your account has been deactivated. Please contact your administrator.',
        error: 'ACCOUNT_INACTIVE'
      });
    }

    // Remove password from user object before attaching to request
    user.password = undefined;
    req.user = user;
    req.tokenIssuedAt = decoded.iat;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication failed. The provided token is invalid or has been tampered with.',
        error: 'INVALID_TOKEN',
        suggestion: 'Please login again to get a new token.'
      });
    } else if (error.name === 'TokenExpiredError') {
      const expiredAt = new Date(error.expiredAt).toLocaleString();
      return res.status(401).json({ 
        success: false, 
        message: 'Your session has expired. Please login again to continue.',
        error: 'TOKEN_EXPIRED',
        expiredAt: expiredAt,
        suggestion: 'Please login to get a fresh token.'
      });
    } else if (error.name === 'NotBeforeError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token not active yet. Please check your system time and try again.',
        error: 'TOKEN_NOT_ACTIVE'
      });
    } else {
      console.error('Authentication error:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'An unexpected error occurred during authentication. Please try again later.',
        error: 'INTERNAL_ERROR'
      });
    }
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required. Please login to access this resource.',
        error: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      const roleList = roles.join(' or ');
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. This resource requires ${roleList} privileges.`,
        error: 'INSUFFICIENT_PERMISSIONS',
        currentRole: req.user.role,
        requiredRoles: roles,
        suggestion: 'Contact your administrator if you believe this is an error.'
      });
    }

    next();
  };
};

// Admin-only middleware (convenience function)
const adminOnly = authorizeRoles('admin');

module.exports = {
  authenticateToken,
  authorizeRoles,
  adminOnly
};
