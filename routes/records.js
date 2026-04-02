const express = require('express');
const Record = require('../models/Record');
const User = require('../models/User');
const { authenticateToken, authorizeRoles, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/records - Create new record (admin only)
router.post('/', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { amount, type, category, date, notes } = req.body;

    // Validate required fields
    if (!amount || !type || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for record creation.',
        error: 'MISSING_REQUIRED_FIELDS',
        required: ['amount', 'type', 'category'],
        provided: { amount: !!amount, type: !!type, category: !!category }
      });
    }

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number greater than 0.',
        error: 'INVALID_AMOUNT',
        provided: amount
      });
    }

    // Validate type
    if (!['income', 'expense'].includes(type.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Type must be either income or expense.',
        error: 'INVALID_TYPE',
        validTypes: ['income', 'expense'],
        provided: type
      });
    }

    // Validate category
    if (typeof category !== 'string' || category.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Category must be at least 2 characters long.',
        error: 'INVALID_CATEGORY',
        provided: category
      });
    }

    // Validate date if provided
    let recordDate = date ? new Date(date) : new Date();
    if (isNaN(recordDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format.',
        error: 'INVALID_DATE',
        provided: date
      });
    }

    // Check if date is in the future
    if (recordDate > new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Date cannot be in the future.',
        error: 'FUTURE_DATE',
        provided: recordDate
      });
    }

    // Validate notes if provided
    if (notes && typeof notes !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Notes must be a string.',
        error: 'INVALID_NOTES',
        provided: notes
      });
    }

    // Create new record
    const record = new Record({
      amount: parseFloat(amount),
      type: type.toLowerCase(),
      category: category.trim(),
      date: recordDate,
      notes: notes ? notes.trim() : '',
      createdBy: req.user._id
    });

    await record.save();

    // Populate creator info
    await record.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Record created successfully.',
      data: {
        record,
        formattedAmount: record.formattedAmount,
        monthYear: record.monthYear
      },
      metadata: {
        timestamp: new Date().toISOString(),
        recordId: record._id.toString()
      }
    });
  } catch (error) {
    console.error('Create record error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error occurred while creating record.',
        error: 'VALIDATION_ERROR',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create record due to an unexpected error.',
      error: 'RECORD_CREATION_FAILED',
      suggestion: 'Please try again later or contact support if the problem persists.'
    });
  }
});

// GET /api/records - Get all records with filters and pagination (admin + analyst)
router.get('/', authenticateToken, authorizeRoles('admin', 'analyst'), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      type, 
      category, 
      startDate, 
      endDate,
      sortBy = 'date',
      sortOrder = 'desc',
      search
    } = req.query;
    
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    
    // Filter by type
    if (type) {
      if (!['income', 'expense'].includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid type filter. Must be income or expense.',
          error: 'INVALID_TYPE_FILTER',
          validTypes: ['income', 'expense']
        });
      }
      filter.type = type.toLowerCase();
    }

    // Filter by category
    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }

    // Filter by date range
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid start date format.',
            error: 'INVALID_START_DATE'
          });
        }
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid end date format.',
            error: 'INVALID_END_DATE'
          });
        }
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    // Search in notes and category
    if (search) {
      filter.$or = [
        { category: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // 🔧 CRITICAL FIX: Role-based data filtering
    // Viewers are not allowed in this route (handled by authorizeRoles)
    // Admins and Analysts see all records (no createdBy filter needed)
    // If you want to add viewer access later, uncomment:
    // if (req.user.role === 'viewer') {
    //   filter.createdBy = req.user._id;
    // }

    // Validate sort options
    const validSortFields = ['date', 'amount', 'category', 'type', 'createdAt'];
    const validSortOrders = ['asc', 'desc'];
    
    if (!validSortFields.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sort field.',
        error: 'INVALID_SORT_FIELD',
        validFields: validSortFields
      });
    }
    
    if (!validSortOrders.includes(sortOrder.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sort order.',
        error: 'INVALID_SORT_ORDER',
        validOrders: validSortOrders
      });
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder.toLowerCase() === 'desc' ? -1 : 1;

    // Execute query
    const records = await Record.find(filter)
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Record.countDocuments(filter);

    // Calculate summary statistics
    const summary = await Record.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
          recordCount: { $sum: 1 },
          avgAmount: { $avg: '$amount' }
        }
      }
    ]);

    const stats = summary[0] || {
      totalIncome: 0,
      totalExpense: 0,
      recordCount: 0,
      avgAmount: 0
    };

    stats.netAmount = stats.totalIncome - stats.totalExpense;

    res.json({
      success: true,
      data: {
        records: records.map(record => ({
          ...record.toJSON(),
          formattedAmount: record.formattedAmount,
          monthYear: record.monthYear
        })),
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: records.length,
          totalRecords: total
        },
        filters: {
          type,
          category,
          startDate,
          endDate,
          search,
          sortBy,
          sortOrder
        },
        summary: {
          ...stats,
          totalIncomeFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(stats.totalIncome),
          totalExpenseFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(stats.totalExpense),
          netAmountFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(stats.netAmount),
          avgAmountFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(stats.avgAmount)
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestedBy: req.user.email
      }
    });
  } catch (error) {
    console.error('Get records error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve records.',
      error: 'RECORDS_RETRIEVAL_FAILED'
    });
  }
});

// GET /api/records/:id - Get specific record (admin + analyst)
router.get('/:id', authenticateToken, authorizeRoles('admin', 'analyst'), async (req, res) => {
  try {
    const record = await Record.findById(req.params.id).populate('createdBy', 'name email');

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
        error: 'RECORD_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: {
        record: {
          ...record.toJSON(),
          formattedAmount: record.formattedAmount,
          monthYear: record.monthYear
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestedBy: req.user.email
      }
    });
  } catch (error) {
    console.error('Get record error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid record ID.',
        error: 'INVALID_RECORD_ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve record.',
      error: 'RECORD_RETRIEVAL_FAILED'
    });
  }
});

// PUT /api/records/:id - Update record (admin only)
router.put('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { amount, type, category, date, notes } = req.body;

    // Find existing record
    const existingRecord = await Record.findById(req.params.id);
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
        error: 'RECORD_NOT_FOUND'
      });
    }

    // Validate and prepare updates
    const updates = {};

    // Validate amount if provided
    if (amount !== undefined) {
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number greater than 0.',
          error: 'INVALID_AMOUNT',
          provided: amount
        });
      }
      updates.amount = parseFloat(amount);
    }

    // Validate type if provided
    if (type !== undefined) {
      if (!['income', 'expense'].includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Type must be either income or expense.',
          error: 'INVALID_TYPE',
          validTypes: ['income', 'expense'],
          provided: type
        });
      }
      updates.type = type.toLowerCase();
    }

    // Validate category if provided
    if (category !== undefined) {
      if (typeof category !== 'string' || category.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Category must be at least 2 characters long.',
          error: 'INVALID_CATEGORY',
          provided: category
        });
      }
      updates.category = category.trim();
    }

    // Validate date if provided
    if (date !== undefined) {
      const recordDate = new Date(date);
      if (isNaN(recordDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format.',
          error: 'INVALID_DATE',
          provided: date
        });
      }
      if (recordDate > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Date cannot be in the future.',
          error: 'FUTURE_DATE',
          provided: recordDate
        });
      }
      updates.date = recordDate;
    }

    // Validate notes if provided
    if (notes !== undefined) {
      if (typeof notes !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Notes must be a string.',
          error: 'INVALID_NOTES',
          provided: notes
        });
      }
      updates.notes = notes.trim();
    }

    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one field must be provided for update.',
        error: 'NO_UPDATES_PROVIDED'
      });
    }

    // Update record
    const record = await Record.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Record updated successfully.',
      data: {
        record: {
          ...record.toJSON(),
          formattedAmount: record.formattedAmount,
          monthYear: record.monthYear
        },
        updatedFields: Object.keys(updates)
      },
      metadata: {
        timestamp: new Date().toISOString(),
        updatedBy: req.user.email
      }
    });
  } catch (error) {
    console.error('Update record error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid record ID.',
        error: 'INVALID_RECORD_ID'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error occurred while updating record.',
        error: 'VALIDATION_ERROR',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update record.',
      error: 'RECORD_UPDATE_FAILED'
    });
  }
});

// DELETE /api/records/:id - Delete record (admin only)
router.delete('/:id', authenticateToken, adminOnly, async (req, res) => {
  try {
    const record = await Record.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
        error: 'RECORD_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Record deleted successfully.',
      data: {
        deletedRecord: {
          ...record.toJSON(),
          formattedAmount: record.formattedAmount,
          monthYear: record.monthYear
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        deletedBy: req.user.email
      }
    });
  } catch (error) {
    console.error('Delete record error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid record ID.',
        error: 'INVALID_RECORD_ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete record.',
      error: 'RECORD_DELETE_FAILED'
    });
  }
});

// GET /api/records/summary - Get summary statistics (admin + analyst)
router.get('/summary/stats', authenticateToken, authorizeRoles('admin', 'analyst'), async (req, res) => {
  try {
    const { startDate, endDate, type, category } = req.query;

    // Build filter
    const filter = {};
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid start date format.',
            error: 'INVALID_START_DATE'
          });
        }
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid end date format.',
            error: 'INVALID_END_DATE'
          });
        }
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (type) {
      filter.type = type.toLowerCase();
    }

    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }

    // 🔧 CRITICAL FIX: Role-based data filtering
    // Admins and Analysts see all records (no createdBy filter needed)
    // Viewers are not allowed in this route (handled by authorizeRoles)

    // Get comprehensive statistics
    const [
      summary,
      categoryBreakdown,
      monthlyTrend,
      recentRecords
    ] = await Promise.all([
      // Overall summary
      Record.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
            totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            recordCount: { $sum: 1 },
            avgAmount: { $avg: '$amount' },
            maxAmount: { $max: '$amount' },
            minAmount: { $min: '$amount' }
          }
        }
      ]),
      
      // Category breakdown
      Record.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            recordCount: { $sum: 1 },
            avgAmount: { $avg: '$amount' },
            type: { $first: '$type' }
          }
        },
        { $sort: { totalAmount: -1 } }
      ]),
      
      // Monthly trend
      Record.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
            totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
            totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            recordCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Recent records
      Record.find(filter)
        .populate('createdBy', 'name email')
        .sort({ date: -1 })
        .limit(5)
    ]);

    const stats = summary[0] || {
      totalIncome: 0,
      totalExpense: 0,
      recordCount: 0,
      avgAmount: 0,
      maxAmount: 0,
      minAmount: 0
    };

    stats.netAmount = stats.totalIncome - stats.totalExpense;

    res.json({
      success: true,
      data: {
        summary: {
          ...stats,
          totalIncomeFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(stats.totalIncome),
          totalExpenseFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(stats.totalExpense),
          netAmountFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(stats.netAmount),
          avgAmountFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(stats.avgAmount),
          maxAmountFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(stats.maxAmount),
          minAmountFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(stats.minAmount)
        },
        categoryBreakdown: categoryBreakdown.map(cat => ({
          ...cat,
          totalAmountFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(cat.totalAmount),
          avgAmountFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(cat.avgAmount)
        })),
        monthlyTrend: monthlyTrend.map(month => ({
          ...month,
          netAmount: month.totalIncome - month.totalExpense,
          netAmountFormatted: new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
          }).format(month.totalIncome - month.totalExpense)
        })),
        recentRecords: recentRecords.map(record => ({
          ...record.toJSON(),
          formattedAmount: record.formattedAmount,
          monthYear: record.monthYear
        }))
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestedBy: req.user.email,
        filters: { startDate, endDate, type, category }
      }
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve summary statistics.',
      error: 'SUMMARY_RETRIEVAL_FAILED'
    });
  }
});

module.exports = router;
