const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Both email and password are required for login.',
        error: 'MISSING_CREDENTIALS',
        required: ['email', 'password']
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

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
        error: 'PASSWORD_TOO_SHORT'
      });
    }

    // Find user with password included
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Login failed. No account found with this email address.',
        error: 'USER_NOT_FOUND',
        suggestion: 'Please check your email or create an account if you\'re new.'
      });
    }

    // Check if user is inactive
    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Account access denied. Your account has been deactivated.',
        error: 'ACCOUNT_INACTIVE',
        suggestion: 'Please contact your administrator to reactivate your account.'
      });
    }

    // Verify password
    const isPasswordValid = user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Login failed. Incorrect password provided.',
        error: 'INVALID_PASSWORD',
        suggestion: 'Please check your password and try again.'
      });
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during login. Please try again later.',
      error: 'LOGIN_FAILED',
      suggestion: 'If the problem persists, please contact support.'
    });
  }
});

// GET /api/auth/me - Get current user profile (protected)
router.get('/me', authenticateToken, async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile. Please try again.',
      error: 'PROFILE_RETRIEVAL_FAILED'
    });
  }
});

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Check if token is still valid (not expired)
    const now = Math.floor(Date.now() / 1000);
    const tokenAge = now - req.tokenIssuedAt;
    const maxAge = 30 * 60; // 30 minutes maximum age for refresh
    
    if (tokenAge > maxAge) {
      return res.status(401).json({
        success: false,
        message: 'Token too old for refresh. Please login again.',
        error: 'TOKEN_TOO_OLD',
        maxAgeMinutes: 30,
        tokenAgeMinutes: Math.floor(tokenAge / 60),
        suggestion: 'Please login with your credentials to get a fresh token.'
      });
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
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token. Please login again.',
      error: 'TOKEN_REFRESH_FAILED',
      suggestion: 'Please login with your credentials to get a new token.'
    });
  }
});

// POST /api/auth/logout - User logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
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
});

module.exports = router;
