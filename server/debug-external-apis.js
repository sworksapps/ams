const axios = require('axios');
const TokenManager = require('./utils/tokenManager');
require('dotenv').config();

// Get configuration from environment
const config = {
  ticketingBaseURL: process.env.EXTERNAL_TICKETING_BASE_URL,
  locationBaseURL: process.env.EXTERNAL_LOCATION_BASE_URL,
  timeout: parseInt(process.env.EXTERNAL_API_TIMEOUT) || 30000
};

console.log('🔧 Configuration loaded:');
console.log('- Ticketing Base URL:', config.ticketingBaseURL);
console.log('- Location Base URL:', config.locationBaseURL);
console.log('- Timeout:', config.timeout);

/**
 * Generate curl command for debugging
 */
function generateCurlCommand(method, url, headers, data = null) {
  let curl = `curl -X ${method} "${url}"`;
  
  // Add headers
  Object.entries(headers).forEach(([key, value]) => {
    curl += ` \\\n  -H "${key}: ${value}"`;
  });
  
  // Add data for POST requests
  if (data && method === 'POST') {
    curl += ` \\\n  -d '${JSON.stringify(data)}'`;
  }
  
  return curl;
}

/**
 * Make API call and log details
 */
async function makeApiCall(name, method, url, data = null) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log('='.repeat(50));
  
  try {
    // Get service token
    const accessToken = await TokenManager.getServiceToken();
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };
    
    // Generate curl command
    const curlCommand = generateCurlCommand(method, url, headers, data);
    console.log('📤 CURL Command:');
    console.log(curlCommand);
    console.log('');
    
    // Make the actual API call
    const startTime = Date.now();
    let response;
    
    if (method === 'GET') {
      response = await axios.get(url, { headers, timeout: config.timeout });
    } else if (method === 'POST') {
      response = await axios.post(url, data, { headers, timeout: config.timeout });
    }
    
    const duration = Date.now() - startTime;
    
    console.log('📥 RESPONSE:');
    console.log(`- Status: ${response.status} ${response.statusText}`);
    console.log(`- Duration: ${duration}ms`);
    console.log('- Headers:', JSON.stringify(response.headers, null, 2));
    console.log('- Data:', JSON.stringify(response.data, null, 2));
    console.log('✅ SUCCESS');
    
    return { success: true, data: response.data, status: response.status };
    
  } catch (error) {
    const duration = Date.now() - Date.now();
    console.log('📥 ERROR RESPONSE:');
    console.log(`- Status: ${error.response?.status || 'N/A'}`);
    console.log(`- Duration: ${duration}ms`);
    if (error.response?.headers) {
      console.log('- Headers:', JSON.stringify(error.response.headers, null, 2));
    }
    if (error.response?.data) {
      console.log('- Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('- Error Message:', error.message);
    }
    console.log('❌ FAILED');
    
    return { success: false, error: error.message, status: error.response?.status };
  }
}

/**
 * Test all external APIs
 */
async function testAllExternalApis() {
  console.log('🚀 Starting External API Debug Session');
  console.log('='.repeat(60));
  
  const results = {};
  
  // 1. Test PPM KPIs
  results.ppmKpis = await makeApiCall(
    'PPM KPIs',
    'POST',
    `${config.ticketingBaseURL}/v1/api/ticket/bmskpicountv2`,
    { ticketType: 'PPM' }
  );
  
  // 2. Test AMC KPIs
  results.amcKpis = await makeApiCall(
    'AMC KPIs',
    'POST',
    `${config.ticketingBaseURL}/v1/api/ticket/bmskpicountv2`,
    { ticketType: 'AMC' }
  );
  
  // 3. Test R&M KPIs
  results.rmKpis = await makeApiCall(
    'R&M KPIs',
    'POST',
    `${config.ticketingBaseURL}/v1/api/ticket/bmskpicountv2`,
    { ticketType: 'RM' }
  );
  
  // 4. Test PPM Tickets List
  results.ppmTickets = await makeApiCall(
    'PPM Tickets List',
    'POST',
    `${config.ticketingBaseURL}/v1/api/ticket/bmsticketlistv2`,
    {
      ticketType: 'PPM',
      page: 1,
      limit: 10,
      filters: {}
    }
  );
  
  // 5. Test AMC Tickets List
  results.amcTickets = await makeApiCall(
    'AMC Tickets List',
    'POST',
    `${config.ticketingBaseURL}/v1/api/ticket/bmsticketlistv2`,
    {
      ticketType: 'AMC',
      page: 1,
      limit: 10,
      filters: {}
    }
  );
  
  // 6. Test R&M Tickets List
  results.rmTickets = await makeApiCall(
    'R&M Tickets List',
    'POST',
    `${config.ticketingBaseURL}/v1/api/ticket/bmsticketlistv2`,
    {
      ticketType: 'RM',
      page: 1,
      limit: 10,
      filters: {}
    }
  );
  
  // 7. Test Location Options
  results.locations = await makeApiCall(
    'Location Options',
    'GET',
    `${config.locationBaseURL}/location`
  );
  
  // 8. Test PPM Status Options
  results.ppmStatus = await makeApiCall(
    'PPM Status Options',
    'POST',
    `${config.ticketingBaseURL}/v1/api/ticket/bmsfilteroptions`,
    { ticketType: 'PPM' }
  );
  
  // 9. Test AMC Status Options
  results.amcStatus = await makeApiCall(
    'AMC Status Options',
    'POST',
    `${config.ticketingBaseURL}/v1/api/ticket/bmsfilteroptions`,
    { ticketType: 'AMC' }
  );
  
  // 10. Test R&M Status Options
  results.rmStatus = await makeApiCall(
    'R&M Status Options',
    'POST',
    `${config.ticketingBaseURL}/v1/api/ticket/bmsfilteroptions`,
    { ticketType: 'RM' }
  );
  
  console.log('\n📊 SUMMARY');
  console.log('='.repeat(60));
  Object.entries(results).forEach(([key, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${key}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
  });
  
  return results;
}

// Run the tests
if (require.main === module) {
  testAllExternalApis()
    .then(() => {
      console.log('\n🎉 External API debug session completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testAllExternalApis, makeApiCall };
