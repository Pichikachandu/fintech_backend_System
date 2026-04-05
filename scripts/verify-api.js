const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@fontech.com',
  password: 'admin123'
};

async function verify() {
  try {
    console.log('--- Starting API Verification ---');

    // 1. Login as Admin
    console.log('\n1. Logging in as Admin...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    const adminToken = loginRes.data.data.token;
    console.log('✅ Admin logged in successfully');

    const adminConfig = { headers: { Authorization: `Bearer ${adminToken}` } };

    // 2. Create a record (Admin)
    console.log('\n2. Creating a financial record (Admin)...');
    const recordData = {
      amount: 1500.50,
      type: 'income',
      category: 'Consulting',
      date: new Date().toISOString(),
      notes: 'Initial consulting fee'
    };
    const createRes = await axios.post(`${BASE_URL}/records`, recordData, adminConfig);
    const recordId = createRes.data.data.record._id;
    console.log(`✅ Record created: ${recordId}`);

    // 3. Get records (Admin)
    console.log('\n3. Fetching all records (Admin)...');
    const getRecordsRes = await axios.get(`${BASE_URL}/records`, adminConfig);
    console.log(`✅ Fetched ${getRecordsRes.data.data.records.length} records`);

    // 4. Get Dashboard Summary (Admin)
    console.log('\n4. Fetching Dashboard Summary (Admin)...');
    const summaryRes = await axios.get(`${BASE_URL}/dashboard/summary`, adminConfig);
    console.log('✅ Dashboard Summary:', JSON.stringify(summaryRes.data.data.summary));

    // 5. Create a Viewer user (Admin)
    console.log('\n5. Creating a Viewer user (Admin)...');
    const viewerData = {
      name: 'Test Viewer',
      email: `viewer_${Date.now()}@test.com`,
      password: 'Password123!',
      role: 'viewer'
    };
    await axios.post(`${BASE_URL}/users`, viewerData, adminConfig);
    console.log(`✅ Viewer user created: ${viewerData.email}`);

    // 6. Login as Viewer
    console.log('\n6. Logging in as Viewer...');
    const viewerLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: viewerData.email,
      password: viewerData.password
    });
    const viewerToken = viewerLoginRes.data.data.token;
    const viewerConfig = { headers: { Authorization: `Bearer ${viewerToken}` } };
    console.log('✅ Viewer logged in successfully');

    // 7. Verify Viewer CANNOT create records (RBAC)
    console.log('\n7. Verifying Viewer RBAC (Attempting to create record)...');
    try {
      await axios.post(`${BASE_URL}/records`, recordData, viewerConfig);
      console.error('❌ Error: Viewer was able to create a record!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ Correct: Viewer access forbidden (403)');
      } else {
        console.error('❌ Unexpected error status:', err.response ? err.response.status : err.message);
      }
    }

    // 8. Verify Viewer CAN view dashboard
    console.log('\n8. Verifying Viewer can view Dashboard Summary...');
    const viewerSummaryRes = await axios.get(`${BASE_URL}/dashboard/summary`, viewerConfig);
    console.log('✅ Viewer Dashboard Summary accessible');

    // 9. Verify Viewer CANNOT view individual records
    console.log('\n9. Verifying Viewer CANNOT view individual records...');
    try {
      await axios.get(`${BASE_URL}/records`, viewerConfig);
      console.error('❌ Error: Viewer was able to list records!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ Correct: Viewer record access forbidden (403)');
      } else {
        console.error('❌ Unexpected error status:', err.response ? err.response.status : err.message);
      }
    }

    // 10. Test Soft Delete (Admin)
    console.log('\n10. Testing Soft Delete (Admin)...');
    await axios.delete(`${BASE_URL}/records/${recordId}`, adminConfig);
    console.log('✅ Record soft-deleted');

    try {
      await axios.get(`${BASE_URL}/records/${recordId}`, adminConfig);
      console.error('❌ Error: Soft-deleted record was still accessible!');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        console.log('✅ Correct: Soft-deleted record is not found (404)');
      } else {
        console.error('❌ Unexpected error status:', err.response ? err.response.status : err.message);
      }
    }

    // 11. Verify Documentation Route
    console.log('\n11. Verifying API Documentation Route...');
    const docsRes = await axios.get(`${BASE_URL}/docs`);
    if (docsRes.data.success) {
      console.log('✅ API Documentation accessible');
    }

    console.log('\n--- API Verification Completed Successfully ---');
  } catch (error) {
    console.error('\n❌ Verification Failed:', error.response ? error.response.data : error.message);
    process.exit(1);
  }
}

verify();

