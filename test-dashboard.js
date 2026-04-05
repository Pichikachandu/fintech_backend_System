const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@fontech.com',
  password: 'admin123'
};

async function runDashboardTests() {
  try {
    console.log('--- Running Dashboard Tests ---');

    console.log('\nLogging in as Admin...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    const token = loginRes.data.data.token;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // 1. Fetch Dashboard Summary
    console.log('1. Fetching /dashboard/summary...');
    const summaryRes = await axios.get(`${BASE_URL}/dashboard/summary`, config);
    if (summaryRes.data.success) {
      console.log('✅ Success: Dashboard summary retrieved');
      console.log('Data:', summaryRes.data.data.summary);
    } else {
      console.error('❌ Failed to retrieve summary');
    }

    // 2. Fetch Category Stats
    console.log('\n2. Fetching /dashboard/category...');
    const categoryRes = await axios.get(`${BASE_URL}/dashboard/category`, config);
    if (categoryRes.data.success) {
      console.log('✅ Success: Category stats retrieved');
      console.log(`Found ${categoryRes.data.data.categories.length} categories`);
    }

    // 3. Fetch Trends
    console.log('\n3. Fetching /dashboard/trends...');
    const trendsRes = await axios.get(`${BASE_URL}/dashboard/trends`, config);
    if (trendsRes.data.success) {
      console.log('✅ Success: Monthly trends retrieved');
    }

    // 4. Fetch Recent Activity
    console.log('\n4. Fetching /dashboard/recent...');
    const recentRes = await axios.get(`${BASE_URL}/dashboard/recent`, config);
    if (recentRes.data.success) {
      console.log('✅ Success: Recent activity retrieved');
    }

    console.log('\n--- Dashboard Tests Completed ---');
  } catch (error) {
    console.error('❌ Error running dashboard tests:', error.message);
  }
}

runDashboardTests();
