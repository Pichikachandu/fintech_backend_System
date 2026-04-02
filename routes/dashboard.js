const express = require('express');
const Record = require('../models/Record');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validate, validationRules } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/dashboard/summary - Total income, expense, and net balance
router.get('/summary', validate(validationRules.dashboard.summary), authenticateToken, authorizeRoles('admin', 'analyst', 'viewer'), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    // 🔧 CRITICAL FIX: Role-based data filtering
    const matchFilter = { ...dateFilter };
    
    // Viewers see dashboard data (all records for summary)
    // Admins and Analysts also see all records
    // No createdBy filter - everyone sees aggregated system data

    const summary = await Record.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const incomeResult = summary.find(item => item._id === 'income') || { total: 0, count: 0 };
    const expenseResult = summary.find(item => item._id === 'expense') || { total: 0, count: 0 };
    
    const totalIncome = incomeResult.total;
    const totalExpense = expenseResult.total;
    const netBalance = totalIncome - totalExpense;

    res.json({
      success: true,
      message: 'Dashboard summary retrieved successfully.',
      data: {
        summary: {
          totalIncome,
          totalExpense,
          netBalance,
          transactionCount: incomeResult.count + expenseResult.count,
          incomeCount: incomeResult.count,
          expenseCount: expenseResult.count
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        dateFilter: dateFilter.date || 'all time',
        requestedBy: req.user.email
      }
    });
}));

// GET /api/dashboard/category - Category-wise totals
router.get('/category', authenticateToken, authorizeRoles('admin', 'analyst', 'viewer'), async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    // 🔧 CRITICAL FIX: Role-based data filtering
    const matchFilter = {};
    
    if (startDate || endDate) {
      matchFilter.date = {};
      if (startDate) matchFilter.date.$gte = new Date(startDate);
      if (endDate) matchFilter.date.$lte = new Date(endDate);
    }
    
    if (type) matchFilter.type = type;

    // Viewers see dashboard data (all records for category analysis)
    // Admins and Analysts also see all records
    // No createdBy filter - everyone sees aggregated system data

    const categoryStats = await Record.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: {
            category: '$category',
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' },
          max: { $max: '$amount' },
          min: { $min: '$amount' }
        }
      },
      {
        $sort: { total: -1 }
      },
      {
        $project: {
          _id: 0,
          category: '$_id.category',
          type: '$_id.type',
          total: 1,
          count: 1,
          average: { $round: ['$average', 2] },
          max: 1,
          min: 1
        }
      }
    ]);

    res.json({
      success: true,
      message: 'Category-wise statistics retrieved successfully.',
      data: {
        categories: categoryStats,
        totalCategories: categoryStats.length
      },
      metadata: {
        timestamp: new Date().toISOString(),
        filters: {
          dateRange: matchFilter.date || 'all time',
          type: type || 'all types'
        },
        requestedBy: req.user.email
      }
    });
  } catch (error) {
    console.error('Dashboard category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve category statistics.',
      error: 'CATEGORY_RETRIEVAL_FAILED'
    });
  }
});

// GET /api/dashboard/trends - Monthly grouped income vs expense
router.get('/trends', authenticateToken, authorizeRoles('admin', 'analyst', 'viewer'), async (req, res) => {
  try {
    const { startDate, endDate, months = 12 } = req.query;
    
    // Build date filter
    const dateFilter = {};
    
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    } else {
      // Default to last N months
      const now = new Date();
      const monthsAgo = new Date(now.getFullYear(), now.getMonth() - parseInt(months) + 1, 1);
      dateFilter.date = { $gte: monthsAgo };
    }

    // 🔧 CRITICAL FIX: Role-based data filtering
    const matchFilter = { ...dateFilter };
    
    // Viewers see dashboard data (all records for trend analysis)
    // Admins and Analysts also see all records
    // No createdBy filter - everyone sees aggregated system data

    const trends = await Record.aggregate([
      {
        $match: matchFilter
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          income: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0]
            }
          },
          expense: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0]
            }
          },
          incomeCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'income'] }, '$count', 0]
            }
          },
          expenseCount: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'expense'] }, '$count', 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          month: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: 1
            }
          },
          income: 1,
          expense: 1,
          net: { $subtract: ['$income', '$expense'] },
          incomeCount: 1,
          expenseCount: 1,
          totalTransactions: { $add: ['$incomeCount', '$expenseCount'] }
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);

    res.json({
      success: true,
      message: 'Monthly trends retrieved successfully.',
      data: {
        trends,
        period: {
          months: parseInt(months),
          dataPoints: trends.length
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        dateRange: matchFilter.date || 'all time',
        requestedBy: req.user.email
      }
    });
  } catch (error) {
    console.error('Dashboard trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monthly trends.',
      error: 'TRENDS_RETRIEVAL_FAILED'
    });
  }
});

// GET /api/dashboard/recent - Last 5 transactions
router.get('/recent', authenticateToken, authorizeRoles('admin', 'analyst', 'viewer'), async (req, res) => {
  try {
    const { limit = 5, type } = req.query;
    
    const matchFilter = {};
    if (type) matchFilter.type = type;

    // 🔧 CRITICAL FIX: Role-based data filtering
    // Viewers see dashboard data (all records for recent activity)
    // Admins and Analysts also see all records
    // No createdBy filter - everyone sees aggregated system data

    const recentTransactions = await Record.aggregate([
      {
        $match: matchFilter
      },
      {
        $sort: { date: -1, createdAt: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                name: 1,
                email: 1
              }
            }
          ]
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          _id: 1,
          amount: 1,
          type: 1,
          category: 1,
          date: 1,
          notes: 1,
          createdAt: 1,
          'user.name': 1,
          'user.email': 1,
          monthYear: {
            $dateToString: {
              format: '%Y-%m',
              date: '$date'
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      message: 'Recent transactions retrieved successfully.',
      data: {
        transactions: recentTransactions,
        count: recentTransactions.length,
        limit: parseInt(limit)
      },
      metadata: {
        timestamp: new Date().toISOString(),
        filters: {
          type: type || 'all types'
        },
        requestedBy: req.user.email
      }
    });
  } catch (error) {
    console.error('Dashboard recent transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent transactions.',
      error: 'RECENT_TRANSACTIONS_FAILED'
    });
  }
});

module.exports = router;
