const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');
const { asyncHandler, businessErrors, ForbiddenError } = require('../middleware/errorHandler');

const router = express.Router();

// POST /api/auth/login - User login
router.post('/login', validate(validationRules.auth.login), asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Find user with password included
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw businessErrors.invalidCredentials;
    }

    // Check if user is inactive
    if (user.status === 'inactive') {
      throw new ForbiddenError('Account access denied. Your account has been deactivated.');
    }

    // Verify password
    const isPasswordValid = user.comparePassword(password);

    if (!isPasswordValid) {
      throw businessErrors.invalidCredentials;
    }

    // Generate JWT token with proper expiry
    const tokenExpiry = process.env.JWT_EXPIRES_IN || '24h';
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        iat: Math.floor(Date.now() / 1000) // Issued at timestamp
      },
      process.env.JWT_SECRET,
      { expiresIn: tokenExpiry }
    );

    // Remove password from user object
    user.password = undefined;

    // Calculate token expiry time for client reference
    const expiresInMs = tokenExpiry.endsWith('h') ? 
      parseInt(tokenExpiry) * 60 * 60 * 1000 : 
      tokenExpiry.endsWith('d') ? 
      parseInt(tokenExpiry) * 24 * 60 * 60 * 1000 : 
      24 * 60 * 60 * 1000; // Default to 24 hours
    
    const expiresAt = new Date(Date.now() + expiresInMs);

    res.json({
      success: true,
      message: 'Login successful! Welcome back.',
      data: {
        user,
        token,
        tokenInfo: {
          expiresIn: tokenExpiry,
          expiresAt: expiresAt.toISOString(),
          tokenType: 'Bearer'
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        sessionId: user._id.toString()
      }
    });
}));



// GET /api/auth/me - Get current user profile (protected)
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  // Add session information
  const sessionInfo = {
    tokenIssuedAt: req.tokenIssuedAt ? new Date(req.tokenIssuedAt * 1000).toISOString() : null,
    sessionDuration: req.tokenIssuedAt ? Date.now() - (req.tokenIssuedAt * 1000) : null
  };

  res.json({
    success: true,
    message: 'User profile retrieved successfully.',
    data: {
      user: req.user,
      session: sessionInfo
    },
    metadata: {
      timestamp: new Date().toISOString()
    }
  });
}));

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', authenticateToken, asyncHandler(async (req, res) => {
  const user = req.user;
  
  // Check if token is still valid (not expired)
  const now = Math.floor(Date.now() / 1000);
  const tokenAge = now - req.tokenIssuedAt;
  const maxAge = 30 * 60; // 30 minutes maximum age for refresh
  
  if (tokenAge > maxAge) {
    throw new businessErrors.UnauthorizedError('Token too old for refresh. Please login again.');
  }

  // Generate new JWT token
  const tokenExpiry = process.env.JWT_EXPIRES_IN || '24h';
  const newToken = jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { expiresIn: tokenExpiry }
  );

  // Calculate token expiry time for client reference
  const expiresInMs = tokenExpiry.endsWith('h') ? 
    parseInt(tokenExpiry) * 60 * 60 * 1000 : 
    tokenExpiry.endsWith('d') ? 
    parseInt(tokenExpiry) * 24 * 60 * 60 * 1000 : 
    24 * 60 * 60 * 1000;
  
  const expiresAt = new Date(Date.now() + expiresInMs);

  res.json({
    success: true,
    message: 'Token refreshed successfully.',
    data: {
      token: newToken,
      tokenInfo: {
        expiresIn: tokenExpiry,
        expiresAt: expiresAt.toISOString(),
        tokenType: 'Bearer'
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      refreshedBy: user.email
    }
  });
}));

// POST /api/auth/logout - User logout (client-side token removal)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // In a stateless JWT setup, logout is handled client-side
  // This endpoint can be used for logging or future token blacklisting
  
  const logoutTime = new Date().toISOString();
  const sessionDuration = req.tokenIssuedAt ? 
    Date.now() - (req.tokenIssuedAt * 1000) : null;

  // Log the logout event (in production, you might want to store this in a database)
  console.log(`User logout: ${req.user.email} at ${logoutTime}, Session duration: ${sessionDuration}ms`);

  res.json({
    success: true,
    message: 'Logout successful. You have been securely logged out.',
    data: {
      loggedOutAt: logoutTime,
      sessionDuration: sessionDuration
    },
    suggestion: 'Please clear your stored token to complete the logout process.'
  });
}));

module.exports = router;
