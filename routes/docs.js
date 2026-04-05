const express = require('express');
const router = express.Router();

// Simple JSON API Documentation
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FinTech Backend API Documentation',
    endpoints: {
      auth: [
        { method: 'POST', path: '/api/auth/login', access: 'Public', description: 'User login' },
        { method: 'GET', path: '/api/auth/me', access: 'Authenticated', description: 'Get current profile' },
        { method: 'POST', path: '/api/auth/refresh', access: 'Authenticated', description: 'Refresh JWT token' },
        { method: 'POST', path: '/api/auth/logout', access: 'Authenticated', description: 'User logout' }
      ],
      users: [
        { method: 'GET', path: '/api/users', access: 'Admin', description: 'List all users' },
        { method: 'POST', path: '/api/users', access: 'Admin', description: 'Create new user' },
        { method: 'GET', path: '/api/users/:id', access: 'Admin', description: 'Get user details' },
        { method: 'PATCH', path: '/api/users/:id', access: 'Admin', description: 'Update user status/role' },
        { method: 'DELETE', path: '/api/users/:id', access: 'Admin', description: 'Delete user' }
      ],
      records: [
        { method: 'GET', path: '/api/records', access: 'Admin, Analyst', description: 'List financial records' },
        { method: 'POST', path: '/api/records', access: 'Admin', description: 'Create record' },
        { method: 'GET', path: '/api/records/:id', access: 'Admin, Analyst', description: 'Get record details' },
        { method: 'PUT', path: '/api/records/:id', access: 'Admin', description: 'Update record' },
        { method: 'DELETE', path: '/api/records/:id', access: 'Admin', description: 'Delete record (Soft delete)' },
        { method: 'GET', path: '/api/records/summary/stats', access: 'Admin, Analyst', description: 'Detailed statistics' }
      ],
      dashboard: [
        { method: 'GET', path: '/api/dashboard/summary', access: 'All Roles', description: 'Financial summary' },
        { method: 'GET', path: '/api/dashboard/category', access: 'All Roles', description: 'Category breakdown' },
        { method: 'GET', path: '/api/dashboard/trends', access: 'All Roles', description: 'Monthly trends' },
        { method: 'GET', path: '/api/dashboard/recent', access: 'All Roles', description: 'Recent activity' }
      ]
    },
    metadata: {
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;
