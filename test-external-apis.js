#!/usr/bin/env node

const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';

// Mock authentication token (you'll need to replace this with a real token from the browser)
const AUTH_TOKEN = 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJfVWVuLTBfTVJCZkxqeWZXSUE4cHBfWTJCVGNnbGJMVnNJNXJoTGNLYXNjIn0.eyJleHAiOjE3Mzc5NjI5NzMsImlhdCI6MTczNzk2MjY3MywiYXV0aF90aW1lIjoxNzM3OTYyNjczLCJqdGkiOiI4ZjI1MjMzYy0zNjI5LTQ0YzQtOTZjYy1hNGZkOTc5MmJhMjgiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvcmVhbG1zL2Fzc2V0LW1hbmFnZW1lbnQiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiODJiMDUyOTYtMzAwYy00MTI2LWIyN2YtZGJkOGQ3OGYwOTM1IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYXNzZXQtbWFuYWdlbWVudC1jbGllbnQiLCJzZXNzaW9uX3N0YXRlIjoiNzJhNzc4MzAtMzA1Zi00YjQ2LWI1YWMtNWQ3YjE1ZjlmNzI4IiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwOi8vbG9jYWxob3N0OjMwMDAiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImRlZmF1bHQtcm9sZXMtYXNzZXQtbWFuYWdlbWVudCIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6InByb2ZpbGUgZW1haWwiLCJzaWQiOiI3MmE3NzgzMC0zMDVmLTRiNDYtYjVhYy01ZDdiMTVmOWY3MjgiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IkhhcmlwcmFzYWQgSyIsInByZWZlcnJlZF91c2VybmFtZSI6ImhhcmlwcmFzYWQua0Bzd29ya3MuY28uaW4iLCJnaXZlbl9uYW1lIjoiSGFyaXByYXNhZCIsImZhbWlseV9uYW1lIjoiSyIsImVtYWlsIjoiaGFyaXByYXNhZC5rQHN3b3Jrcy5jby5pbiJ9.example-signature';

// External API endpoints to test
const EXTERNAL_ENDPOINTS = [
  // PPM (Maintenance) APIs
  {
    name: 'PPM Tasks List',
    method: 'POST',
    url: `${BASE_URL}/maintenance/ppm-tasks`,
    body: {
      page: 1,
      limit: 10,
      filters: {}
    }
  },
  {
    name: 'PPM KPIs',
    method: 'GET',
    url: `${BASE_URL}/maintenance/ppm-kpis?ticketType=PPM`
  },
  {
    name: 'PPM Location Options',
    method: 'GET',
    url: `${BASE_URL}/maintenance/location-options`
  },
  {
    name: 'PPM Status Options',
    method: 'GET',
    url: `${BASE_URL}/maintenance/status-options`
  },
  
  // R&M (Repairs) APIs
  {
    name: 'R&M Tasks List',
    method: 'POST',
    url: `${BASE_URL}/repairs`,
    body: {
      page: 1,
      limit: 10,
      filters: {}
    }
  },
  {
    name: 'R&M KPIs',
    method: 'GET',
    url: `${BASE_URL}/repairs/kpis`
  },
  {
    name: 'R&M Location Options',
    method: 'GET',
    url: `${BASE_URL}/repairs/location-options`
  },
  {
    name: 'R&M Status Options',
    method: 'GET',
    url: `${BASE_URL}/repairs/status-options`
  },
  
  // AMC Renewal APIs
  {
    name: 'AMC Renewal Tasks List',
    method: 'POST',
    url: `${BASE_URL}/amc-renewal`,
    body: {
      page: 1,
      limit: 10,
      filters: {}
    }
  },
  {
    name: 'AMC Renewal KPIs',
    method: 'GET',
    url: `${BASE_URL}/amc-renewal/kpis`
  },
  
  // Dashboard APIs
  {
    name: 'Dashboard Stats',
    method: 'GET',
    url: `${BASE_URL}/dashboard`
  }
];

// Internal APIs to test
const INTERNAL_ENDPOINTS = [
  {
    name: 'Assets List',
    method: 'GET',
    url: `${BASE_URL}/assets`
  },
  {
    name: 'Categories List',
    method: 'GET',
    url: `${BASE_URL}/categories`
  },
  {
    name: 'Locations List',
    method: 'GET',
    url: `${BASE_URL}/locations`
  },
  {
    name: 'Maintenance Schedules',
    method: 'GET',
    url: `${BASE_URL}/maintenance/schedules`
  },
  {
    name: 'Coverage List',
    method: 'GET',
    url: `${BASE_URL}/coverage`
  }
];

async function testEndpoint(endpoint) {
  console.log(`\n🧪 Testing: ${endpoint.name}`);
  console.log(`📍 ${endpoint.method} ${endpoint.url}`);
  
  const options = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': AUTH_TOKEN
    }
  };
  
  if (endpoint.body) {
    options.body = JSON.stringify(endpoint.body);
    console.log(`📤 Request Body:`, JSON.stringify(endpoint.body, null, 2));
  }
  
  try {
    const response = await fetch(endpoint.url, options);
    const responseText = await response.text();
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📥 Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    try {
      const responseData = JSON.parse(responseText);
      console.log(`📥 Response Data:`, JSON.stringify(responseData, null, 2));
    } catch (e) {
      console.log(`📥 Response Text:`, responseText);
    }
    
    // Generate curl command
    let curlCommand = `curl -X ${endpoint.method} "${endpoint.url}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: ${AUTH_TOKEN}"`;
    
    if (endpoint.body) {
      curlCommand += ` \\
  -d '${JSON.stringify(endpoint.body)}'`;
    }
    
    console.log(`\n🔧 Curl Command:`);
    console.log(curlCommand);
    
    return {
      name: endpoint.name,
      status: response.status,
      success: response.ok,
      response: responseText
    };
    
  } catch (error) {
    console.log(`❌ Error:`, error.message);
    return {
      name: endpoint.name,
      status: 'ERROR',
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 Starting External API Testing');
  console.log('=' .repeat(50));
  
  const results = [];
  
  console.log('\n📡 EXTERNAL API ENDPOINTS');
  console.log('=' .repeat(30));
  
  for (const endpoint of EXTERNAL_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
  }
  
  console.log('\n🏠 INTERNAL API ENDPOINTS');
  console.log('=' .repeat(30));
  
  for (const endpoint of INTERNAL_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY');
  console.log('=' .repeat(20));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📊 Total: ${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ FAILED ENDPOINTS:');
    failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.status} ${f.error || ''}`);
    });
  }
  
  if (successful.length > 0) {
    console.log('\n✅ SUCCESSFUL ENDPOINTS:');
    successful.forEach(s => {
      console.log(`  - ${s.name}: ${s.status}`);
    });
  }
}

// Note: You need to replace the AUTH_TOKEN with a real token from the browser
console.log('⚠️  IMPORTANT: Replace AUTH_TOKEN with a real token from the browser session');
console.log('   You can get it from browser dev tools > Application > Local Storage > keycloak token');
console.log('   Or from the Network tab in a successful API request Authorization header\n');

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };
