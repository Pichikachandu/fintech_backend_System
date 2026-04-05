const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@fontech.com',
  password: 'admin123'
};

async function runValidationTests() {
  try {
    console.log('--- Running Validation Tests ---');

    console.log('\nLogging in as Admin...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    const token = loginRes.data.data.token;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // 1. Test missing fields
    console.log('1. Testing missing fields for record creation...');
    try {
      await axios.post(`${BASE_URL}/records`, { amount: 100 }, config);
      console.error('❌ Failed: Should have returned validation error for missing fields');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ Success: Received 400 for missing fields');
      } else {
        console.error('❌ Unexpected error:', err.response ? err.response.status : err.message);
      }
    }

    // 2. Test invalid amount
    console.log('2. Testing invalid amount (negative)...');
    try {
      await axios.post(`${BASE_URL}/records`, {
        amount: -50,
        type: 'income',
        category: 'Test'
      }, config);
      console.error('❌ Failed: Should have returned validation error for negative amount');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ Success: Received 400 for negative amount');
      } else {
        console.error('❌ Unexpected error:', err.response ? err.response.status : err.message);
      }
    }

    // 3. Test invalid type
    console.log('3. Testing invalid transaction type...');
    try {
      await axios.post(`${BASE_URL}/records`, {
        amount: 100,
        type: 'invalid_type',
        category: 'Test'
      }, config);
      console.error('❌ Failed: Should have returned validation error for invalid type');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ Success: Received 400 for invalid type');
      } else {
        console.error('❌ Unexpected error:', err.response ? err.response.status : err.message);
      }
    }

    // 4. Test invalid date (future)
    console.log('4. Testing invalid date (future)...');
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    try {
      await axios.post(`${BASE_URL}/records`, {
        amount: 100,
        type: 'income',
        category: 'Test',
        date: futureDate.toISOString()
      }, config);
      console.error('❌ Failed: Should have returned validation error for future date');
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ Success: Received 400 for future date');
      } else {
        console.error('❌ Unexpected error:', err.response ? err.response.status : err.message);
      }
    }

    console.log('\n--- Validation Tests Completed ---');
  } catch (error) {
    console.error('❌ Error running validation tests:', error.message);
  }
}

runValidationTests();
