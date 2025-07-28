const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:5001/api';
const TEST_RESULTS = [];

// Helper function to log test results
function logTest(testName, status, details = '') {
  const result = {
    test: testName,
    status: status,
    details: details,
    timestamp: new Date().toISOString()
  };
  TEST_RESULTS.push(result);
  
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${statusIcon} ${testName}: ${status}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

// Test API endpoints
async function testAPIEndpoints() {
  console.log('\n🔍 TESTING API ENDPOINTS\n');
  
  // Test 1: Health Check
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    logTest('Health Check', 'PASS', `Status: ${response.status}`);
  } catch (error) {
    logTest('Health Check', 'FAIL', error.message);
    return false; // If health check fails, no point in continuing
  }

  // Test 2: Categories API
  try {
    const response = await axios.get(`${BASE_URL}/categories`);
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      logTest('Categories API', 'PASS', `Found ${response.data.length} categories`);
      
      // Test subcategories for first category
      const firstCategory = response.data[0];
      try {
        const subResponse = await axios.get(`${BASE_URL}/categories/by-name/${firstCategory.name}/subcategories`);
        logTest('Subcategories API', 'PASS', `Found ${subResponse.data.length} subcategories for ${firstCategory.name}`);
      } catch (subError) {
        logTest('Subcategories API', 'FAIL', subError.message);
      }
    } else {
      logTest('Categories API', 'FAIL', 'No categories returned or invalid format');
    }
  } catch (error) {
    logTest('Categories API', 'FAIL', error.message);
  }

  // Test 3: Locations API
  try {
    const response = await axios.get(`${BASE_URL}/locations`);
    if (response.data && response.data.success) {
      logTest('Locations API', 'PASS', `Found ${response.data.data.length} locations`);
      
      // Test floors for first location if available
      if (response.data.data.length > 0) {
        const firstLocation = response.data.data[0];
        try {
          const floorResponse = await axios.get(`${BASE_URL}/locations/${firstLocation.centerId}/floors`);
          if (floorResponse.data && floorResponse.data.success) {
            logTest('Floors API', 'PASS', `Found ${floorResponse.data.data.length} floors for ${firstLocation.label}`);
          } else {
            logTest('Floors API', 'FAIL', floorResponse.data?.error || 'Invalid response format');
          }
        } catch (floorError) {
          logTest('Floors API', 'FAIL', floorError.response?.data?.error || floorError.message);
        }
      }
    } else {
      logTest('Locations API', 'FAIL', response.data?.error || 'Invalid response format');
    }
  } catch (error) {
    logTest('Locations API', 'FAIL', error.response?.data?.error || error.message);
  }

  // Test 4: Assets API
  try {
    const response = await axios.get(`${BASE_URL}/assets`);
    logTest('Assets List API', 'PASS', `Status: ${response.status}`);
  } catch (error) {
    logTest('Assets List API', 'FAIL', error.message);
  }

  return true;
}

// Test asset creation workflow
async function testAssetCreation() {
  console.log('\n🏗️ TESTING ASSET CREATION WORKFLOW\n');
  
  // First get required data
  let categories = [];
  let locations = [];
  
  try {
    const catResponse = await axios.get(`${BASE_URL}/categories`);
    categories = catResponse.data || [];
  } catch (error) {
    logTest('Asset Creation - Get Categories', 'FAIL', 'Cannot get categories for asset creation');
    return;
  }

  try {
    const locResponse = await axios.get(`${BASE_URL}/locations`);
    locations = locResponse.data?.data || [];
  } catch (error) {
    logTest('Asset Creation - Get Locations', 'FAIL', 'Cannot get locations for asset creation');
    return;
  }

  if (categories.length === 0 || locations.length === 0) {
    logTest('Asset Creation - Prerequisites', 'FAIL', 'Missing categories or locations data');
    return;
  }

  // Create test asset
  const testAsset = {
    equipment_name: 'Test Asset ' + Date.now(),
    category: categories[0].name,
    location: locations[0].label,
    asset_type: 'Building asset',
    floor: 'Ground Floor',
    model_number: 'TEST-001',
    capacity: '100',
    unit: 'kW',
    manufacturer: 'Test Manufacturer',
    serial_number: 'SN' + Date.now(),
    purchase_price: '50000',
    poc_number: '9876543210',
    poc_name: 'Test POC',
    owned_by: 'Landlord',
    subcategory: '',
    make: 'Test Make',
    photos: [],
    maintenance_schedules: [],
    coverage: {
      vendor_name: '',
      coverage_type: 'Not Applicable',
      amc_po: '',
      amc_po_date: '',
      amc_amount: '',
      amc_type: '',
      period_from: '',
      period_till: '',
      month_of_expiry: '',
      remarks: '',
      assets_owner: '',
      types_of_service: ''
    }
  };

  try {
    const response = await axios.post(`${BASE_URL}/assets`, testAsset);
    if (response.status === 201) {
      logTest('Asset Creation', 'PASS', `Created asset with ID: ${response.data.id}`);
      
      // Test asset retrieval
      try {
        const getResponse = await axios.get(`${BASE_URL}/assets/${response.data.id}`);
        logTest('Asset Retrieval', 'PASS', `Retrieved asset: ${getResponse.data.equipment_name}`);
        
        // Clean up - delete test asset
        try {
          await axios.delete(`${BASE_URL}/assets/${response.data.id}`);
          logTest('Asset Cleanup', 'PASS', 'Test asset deleted successfully');
        } catch (deleteError) {
          logTest('Asset Cleanup', 'WARN', 'Could not delete test asset');
        }
      } catch (getError) {
        logTest('Asset Retrieval', 'FAIL', getError.message);
      }
    } else {
      logTest('Asset Creation', 'FAIL', `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    logTest('Asset Creation', 'FAIL', error.response?.data?.error || error.message);
  }
}

// Test frontend integration points
async function testFrontendIntegration() {
  console.log('\n🖥️ TESTING FRONTEND INTEGRATION POINTS\n');
  
  // Check if asset management page can load required data
  const endpoints = [
    { name: 'Categories for Dropdown', url: `${BASE_URL}/categories` },
    { name: 'Locations for Dropdown', url: `${BASE_URL}/locations` },
    { name: 'Assets List', url: `${BASE_URL}/assets` }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url);
      const isValidResponse = response.status === 200 && response.data;
      
      if (isValidResponse) {
        // Check data structure
        if (endpoint.name.includes('Categories')) {
          const hasValidStructure = Array.isArray(response.data) && 
                                  response.data.every(item => item.id && item.name);
          logTest(endpoint.name, hasValidStructure ? 'PASS' : 'FAIL', 
                 hasValidStructure ? 'Valid structure' : 'Invalid data structure');
        } else if (endpoint.name.includes('Locations')) {
          const hasValidStructure = response.data.success && 
                                  Array.isArray(response.data.data) &&
                                  response.data.data.every(item => item.value && item.label);
          logTest(endpoint.name, hasValidStructure ? 'PASS' : 'FAIL', 
                 hasValidStructure ? 'Valid structure' : 'Invalid data structure');
        } else {
          logTest(endpoint.name, 'PASS', 'Endpoint accessible');
        }
      } else {
        logTest(endpoint.name, 'FAIL', 'Invalid response');
      }
    } catch (error) {
      logTest(endpoint.name, 'FAIL', error.response?.data?.error || error.message);
    }
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 STARTING COMPREHENSIVE ASSET FORM TESTING\n');
  console.log('=' * 60);
  
  const startTime = Date.now();
  
  // Run all tests
  await testAPIEndpoints();
  await testAssetCreation();
  await testFrontendIntegration();
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Generate summary
  console.log('\n📊 TEST SUMMARY\n');
  console.log('=' * 60);
  
  const passed = TEST_RESULTS.filter(r => r.status === 'PASS').length;
  const failed = TEST_RESULTS.filter(r => r.status === 'FAIL').length;
  const warnings = TEST_RESULTS.filter(r => r.status === 'WARN').length;
  
  console.log(`Total Tests: ${TEST_RESULTS.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️ Warnings: ${warnings}`);
  console.log(`⏱️ Duration: ${duration}ms`);
  
  // Show failed tests
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    TEST_RESULTS.filter(r => r.status === 'FAIL').forEach(test => {
      console.log(`• ${test.test}: ${test.details}`);
    });
  }
  
  // Save detailed results to file
  const reportPath = path.join(__dirname, 'asset-form-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: { total: TEST_RESULTS.length, passed, failed, warnings, duration },
    tests: TEST_RESULTS,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  return { passed, failed, warnings };
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testAPIEndpoints, testAssetCreation, testFrontendIntegration };
