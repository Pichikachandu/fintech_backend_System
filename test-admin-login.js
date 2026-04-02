require('dotenv').config();
const mongoose = require('mongoose');

async function testAdminLogin() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintech';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Import User model after connection
    const User = require('./models/User');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@fontech.com' }).select('+password');
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`Email: ${admin.email}`);
    console.log(`Name: ${admin.name}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Status: ${admin.status}`);
    
    // Test password comparison
    const isPasswordValid = admin.comparePassword('admin123');
    console.log(`\n🔐 Password test: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
    
    if (isPasswordValid) {
      console.log('\n🚀 Admin credentials are ready for login!');
      console.log('You can now use these credentials to login via the API:');
      console.log('POST /api/auth/login');
      console.log('Body: { "email": "admin@fontech.com", "password": "admin123" }');
    }
    
  } catch (error) {
    console.error('Error testing admin login:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testAdminLogin();
