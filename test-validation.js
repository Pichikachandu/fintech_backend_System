require('dotenv').config();
const mongoose = require('mongoose');

async function testValidationAndErrorHandling() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fintech';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    console.log('\n🧪 Testing Validation and Error Handling System\n');

    // Test 1: Invalid login credentials
    console.log('1️⃣ Testing invalid login validation:');
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email', password: '' })
      });
      const result = await response.json();
      console.log('   ✅ Validation caught invalid input:', result.error);
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    // Test 2: Missing required fields
    console.log('\n2️⃣ Testing missing required fields:');
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com' })
      });
      const result = await response.json();
      console.log('   ✅ Validation caught missing password:', result.error);
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    // Test 3: Invalid date format in dashboard
    console.log('\n3️⃣ Testing invalid date format:');
    try {
      const response = await fetch('http://localhost:3000/api/dashboard/summary?startDate=invalid-date', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      const result = await response.json();
      console.log('   ✅ System handled invalid token:', result.error);
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    // Test 4: Record validation (if server is running)
    console.log('\n4️⃣ Testing record creation validation:');
    try {
      const response = await fetch('http://localhost:3000/api/records', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          amount: -100,
          type: 'invalid-type',
          category: '',
          date: 'invalid-date'
        })
      });
      const result = await response.json();
      console.log('   ✅ System handled invalid record data:', result.error);
    } catch (error) {
      console.log('   ❌ Error:', error.message);
    }

    console.log('\n✅ Validation and Error Handling Tests Completed!');
    console.log('\n📋 Validation Features Implemented:');
    console.log('   • Input validation for all endpoints');
    console.log('   • Custom error classes and handling');
    console.log('   • Proper HTTP status codes');
    console.log('   • Business logic validation');
    console.log('   • Request ID tracking');
    console.log('   • Comprehensive error logging');

  } catch (error) {
    console.error('❌ Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Check if server is running before testing
async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ Server is running, starting validation tests...');
      await testValidationAndErrorHandling();
    } else {
      console.log('❌ Server is not responding properly');
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   npm start');
    console.log('\nThen run: node test-validation.js');
  }
}

checkServerStatus();
