/**
 * Test the /api/locations endpoint with proper authentication
 */

require('dotenv').config();
const fetch = require('node-fetch');
const TokenManager = require('./utils/tokenManager');

async function testLocationsEndpoint() {
  console.log('🧪 Testing /api/locations endpoint with authentication...\n');

  try {
    // Get a valid token
    console.log('1. Getting authentication token...');
    const token = await TokenManager.getServiceToken();
    console.log(`   ✅ Token obtained: ${token.substring(0, 50)}...`);

    // Test the endpoint
    console.log('\n2. Testing /api/locations endpoint...');
    const response = await fetch('http://localhost:5000/api/locations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ SUCCESS!');
      console.log(`   Locations count: ${data.data ? data.data.length : 'unknown'}`);
      
      if (data.data && data.data.length > 0) {
        const sample = data.data[0];
        console.log('   Sample location:');
        console.log(`     - Value: ${sample.value}`);
        console.log(`     - Label: ${sample.label}`);
        console.log(`     - AlternateId: ${sample.alternateId}`);
        console.log(`     - CenterId: ${sample.centerId}`);
      }
    } else {
      const errorText = await response.text();
      console.log('   ❌ FAILED');
      console.log(`   Error: ${errorText}`);
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testLocationsEndpoint().catch(console.error);
