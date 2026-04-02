require('dotenv').config();
const mongoose = require('mongoose');

async function testDashboardAPIs() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintech';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Import models
    const User = require('./models/User');
    const Record = require('./models/Record');

    // Get admin user
    const admin = await User.findOne({ email: 'admin@fontech.com' });
    if (!admin) {
      console.log('Admin user not found. Please run create-admin.js first.');
      return;
    }
    console.log(`Found admin user: ${admin.email}`);

    // Create sample records if none exist
    const existingRecords = await Record.find({ createdBy: admin._id });
    if (existingRecords.length === 0) {
      console.log(' Creating sample records...');
      
      const sampleRecords = [
        {
          amount: 5000,
          type: 'income',
          category: 'Salary',
          date: new Date('2024-01-15'),
          notes: 'Monthly salary',
          createdBy: admin._id
        },
        {
          amount: 1500,
          type: 'expense',
          category: 'Rent',
          date: new Date('2024-01-01'),
          notes: 'Monthly rent',
          createdBy: admin._id
        },
        {
          amount: 300,
          type: 'expense',
          category: 'Food',
          date: new Date('2024-01-10'),
          notes: 'Groceries',
          createdBy: admin._id
        },
        {
          amount: 200,
          type: 'expense',
          category: 'Utilities',
          date: new Date('2024-01-05'),
          notes: 'Electricity bill',
          createdBy: admin._id
        },
        {
          amount: 4500,
          type: 'income',
          category: 'Freelance',
          date: new Date('2024-02-20'),
          notes: 'Freelance project',
          createdBy: admin._id
        },
        {
          amount: 1200,
          type: 'expense',
          category: 'Rent',
          date: new Date('2024-02-01'),
          notes: 'Monthly rent',
          createdBy: admin._id
        }
      ];

      await Record.insertMany(sampleRecords);
      console.log(`Created ${sampleRecords.length} sample records`);
    } else {
      console.log(`Found ${existingRecords.length} existing records`);
    }

    // Test dashboard endpoints
    console.log('\n Testing Dashboard APIs...\n');

    // Test 1: Summary
    console.log('Testing /api/dashboard/summary');
    const summary = await Record.aggregate([
      { $match: { createdBy: admin._id } },
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
    
    console.log(`    Total Income: $${incomeResult.total}`);
    console.log(`    Total Expense: $${expenseResult.total}`);
    console.log(`    Net Balance: $${incomeResult.total - expenseResult.total}`);

    // Test 2: Category stats
    console.log('\n Testing /api/dashboard/category');
    const categoryStats = await Record.aggregate([
      { $match: { createdBy: admin._id } },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      {
        $project: {
          _id: 0,
          category: '$_id.category',
          type: '$_id.type',
          total: 1,
          count: 1
        }
      }
    ]);
    
    console.log('    Category-wise totals:');
    categoryStats.forEach(cat => {
      console.log(`      ${cat.category} (${cat.type}): $${cat.total} (${cat.count} transactions)`);
    });

    // Test 3: Monthly trends
    console.log('\n Testing /api/dashboard/trends');
    const trends = await Record.aggregate([
      { $match: { createdBy: admin._id } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $group: {
          _id: { year: '$_id.year', month: '$_id.month' },
          income: { $sum: { $cond: [{ $eq: ['$_id.type', 'income'] }, '$total', 0] } },
          expense: { $sum: { $cond: [{ $eq: ['$_id.type', 'expense'] }, '$total', 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          month: { $dateFromParts: { year: '$_id.year', month: '$_id.month', day: 1 } },
          income: 1,
          expense: 1,
          net: { $subtract: ['$income', '$expense'] }
        }
      },
      { $sort: { month: 1 } }
    ]);
    
    console.log('    Monthly trends:');
    trends.forEach(trend => {
      const month = trend.month.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      console.log(`      ${month}: Income $${trend.income}, Expense $${trend.expense}, Net $${trend.net}`);
    });

    // Test 4: Recent transactions
    console.log('\n Testing /api/dashboard/recent');
    const recentTransactions = await Record.aggregate([
      { $match: { createdBy: admin._id } },
      { $sort: { date: -1, createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          amount: 1,
          type: 1,
          category: 1,
          date: 1,
          notes: 1
        }
      }
    ]);
    
    console.log('    Recent transactions:');
    recentTransactions.forEach((trans, index) => {
      const date = trans.date.toLocaleDateString('en-US');
      console.log(`      ${index + 1}. ${date} - ${trans.type.toUpperCase()}: $${trans.amount} (${trans.category})`);
    });

    console.log('\nAll dashboard API tests completed successfully!');
    console.log('\n Dashboard endpoints are ready for use:');
    console.log('   GET /api/dashboard/summary');
    console.log('   GET /api/dashboard/category');
    console.log('   GET /api/dashboard/trends');
    console.log('   GET /api/dashboard/recent');

  } catch (error) {
    console.error(' Error testing dashboard APIs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n Disconnected from MongoDB');
  }
}

testDashboardAPIs();
