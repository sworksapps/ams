#!/usr/bin/env node

/**
 * Frontend Functionality Test Script
 * Tests location dropdown data and asset creation/editing without authentication
 * by directly accessing the database through Prisma
 */

const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

// Initialize Prisma client with proper configuration
let prisma;
try {
  prisma = new PrismaClient({
    log: ['error', 'warn'],
  });
} catch (error) {
  console.error('Failed to initialize Prisma client:', error.message);
  process.exit(1);
}

// Test configuration
const TEST_CONFIG = {
  SERVER_URL: 'http://localhost:5000',
  MOCK_USER: {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com'
  }
};

// Logging utilities
const log = {
  info: (msg) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}`),
  success: (msg) => console.log(`[${new Date().toISOString()}] [SUCCESS] ${msg}`),
  error: (msg) => console.log(`[${new Date().toISOString()}] [ERROR] ${msg}`),
  warning: (msg) => console.log(`[${new Date().toISOString()}] [WARNING] ${msg}`)
};

/**
 * Test 1: Direct Database Location Data Test
 * Tests if location data exists in database (what dropdown should show)
 */
async function testLocationDataDirect() {
  log.info('--- Testing Location Data (Direct Database Access) ---');
  
  try {
    // Get locations directly from database
    const locations = await prisma.locations.findMany({
      select: {
        id: true,
        name: true,
        center_id: true,
        floor: true,
        status: true
      },
      where: {
        status: 'active'
      },
      orderBy: {
        name: 'asc'
      }
    });

    log.success(`Found ${locations.length} active locations in database:`);
    locations.forEach((location, index) => {
      console.log(`  ${index + 1}. ${location.name} (ID: ${location.id}, Floor: ${location.floor || 'N/A'})`);
    });

    if (locations.length === 0) {
      log.warning('No active locations found! This explains why dropdown is empty.');
      
      // Check if there are any locations at all
      const allLocations = await prisma.locations.findMany();
      log.info(`Total locations in database: ${allLocations.length}`);
      
      if (allLocations.length > 0) {
        log.info('Locations exist but may be inactive. Sample locations:');
        allLocations.slice(0, 3).forEach(loc => {
          console.log(`  - ${loc.name} (Status: ${loc.status})`);
        });
      }
    }

    return { success: true, count: locations.length, data: locations };
  } catch (error) {
    log.error(`Location data test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Direct Database Categories Test
 */
async function testCategoriesDataDirect() {
  log.info('--- Testing Categories Data (Direct Database Access) ---');
  
  try {
    const categories = await prisma.categories.findMany({
      select: {
        id: true,
        name: true,
        status: true
      },
      where: {
        status: 'active'
      },
      orderBy: {
        name: 'asc'
      }
    });

    log.success(`Found ${categories.length} active categories in database:`);
    categories.forEach((category, index) => {
      console.log(`  ${index + 1}. ${category.name} (ID: ${category.id})`);
    });

    return { success: true, count: categories.length, data: categories };
  } catch (error) {
    log.error(`Categories data test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Asset Creation Test (Direct Database)
 */
async function testAssetCreationDirect() {
  log.info('--- Testing Asset Creation (Direct Database Access) ---');
  
  try {
    // Get first available location and category
    const location = await prisma.locations.findFirst({
      where: { status: 'active' }
    });
    
    const category = await prisma.categories.findFirst({
      where: { status: 'active' }
    });

    if (!location || !category) {
      log.error('Cannot test asset creation: missing active location or category');
      return { success: false, error: 'Missing required data' };
    }

    // Create test asset
    const testAsset = {
      asset_name: `Test Asset ${Date.now()}`,
      asset_id: `TEST-${Date.now()}`,
      category: category.name,
      location: location.name,
      status: 'active',
      purchase_date: new Date(),
      warranty_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      description: 'Test asset created by automated test',
      created_by: TEST_CONFIG.MOCK_USER.id,
      updated_by: TEST_CONFIG.MOCK_USER.id
    };

    const createdAsset = await prisma.assets.create({
      data: testAsset
    });

    log.success(`Asset created successfully with ID: ${createdAsset.id}`);
    log.info(`Asset details: ${createdAsset.asset_name} at ${createdAsset.location}`);

    return { 
      success: true, 
      assetId: createdAsset.id, 
      asset: createdAsset 
    };
  } catch (error) {
    log.error(`Asset creation test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: Asset Update Test (Direct Database)
 */
async function testAssetUpdateDirect(assetId) {
  log.info('--- Testing Asset Update (Direct Database Access) ---');
  
  if (!assetId) {
    log.warning('No asset ID provided for update test');
    return { success: false, error: 'No asset ID' };
  }

  try {
    const updatedAsset = await prisma.assets.update({
      where: { id: assetId },
      data: {
        description: `Updated test asset - ${new Date().toISOString()}`,
        updated_by: TEST_CONFIG.MOCK_USER.id,
        updated_at: new Date()
      }
    });

    log.success(`Asset updated successfully: ${updatedAsset.asset_name}`);
    return { success: true, asset: updatedAsset };
  } catch (error) {
    log.error(`Asset update test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 5: Asset Retrieval Test (Direct Database)
 */
async function testAssetRetrievalDirect(assetId) {
  log.info('--- Testing Asset Retrieval (Direct Database Access) ---');
  
  if (!assetId) {
    log.warning('No asset ID provided for retrieval test');
    return { success: false, error: 'No asset ID' };
  }

  try {
    const asset = await prisma.assets.findUnique({
      where: { id: assetId },
      include: {
        // Include related data if needed
      }
    });

    if (asset) {
      log.success(`Asset retrieved successfully: ${asset.asset_name}`);
      log.info(`Asset location: ${asset.location}, Category: ${asset.category}`);
      return { success: true, asset };
    } else {
      log.error('Asset not found');
      return { success: false, error: 'Asset not found' };
    }
  } catch (error) {
    log.error(`Asset retrieval test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test 6: Server Health Check
 */
async function testServerHealth() {
  log.info('--- Testing Server Health ---');
  
  try {
    const response = await axios.get(`${TEST_CONFIG.SERVER_URL}/api/health`, {
      timeout: 5000
    });
    
    log.success(`Server health check passed: ${JSON.stringify(response.data)}`);
    return { success: true, data: response.data };
  } catch (error) {
    log.error(`Server health check failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Cleanup Test Assets
 */
async function cleanupTestAssets(assetIds = []) {
  log.info('--- Cleanup Test Assets ---');
  
  if (assetIds.length === 0) {
    log.info('No test assets to cleanup');
    return;
  }

  try {
    // Soft delete test assets by setting status to inactive
    const result = await prisma.assets.updateMany({
      where: {
        id: { in: assetIds }
      },
      data: {
        status: 'inactive',
        updated_by: TEST_CONFIG.MOCK_USER.id,
        updated_at: new Date()
      }
    });

    log.success(`Cleaned up ${result.count} test assets`);
  } catch (error) {
    log.error(`Cleanup failed: ${error.message}`);
  }
}

/**
 * Main Test Runner
 */
async function runTests() {
  log.info('Starting Frontend Functionality Tests...');
  log.info('============================================================');

  const results = {
    serverHealth: null,
    locationData: null,
    categoriesData: null,
    assetCreation: null,
    assetUpdate: null,
    assetRetrieval: null
  };

  const testAssetIds = [];

  try {
    // Test 1: Server Health
    results.serverHealth = await testServerHealth();

    // Test 2: Location Data (Direct DB)
    results.locationData = await testLocationDataDirect();

    // Test 3: Categories Data (Direct DB)
    results.categoriesData = await testCategoriesDataDirect();

    // Test 4: Asset Creation (Direct DB)
    results.assetCreation = await testAssetCreationDirect();
    if (results.assetCreation.success) {
      testAssetIds.push(results.assetCreation.assetId);
    }

    // Test 5: Asset Update (Direct DB)
    if (results.assetCreation.success) {
      results.assetUpdate = await testAssetUpdateDirect(results.assetCreation.assetId);
    }

    // Test 6: Asset Retrieval (Direct DB)
    if (results.assetCreation.success) {
      results.assetRetrieval = await testAssetRetrievalDirect(results.assetCreation.assetId);
    }

  } catch (error) {
    log.error(`Test execution failed: ${error.message}`);
  } finally {
    // Cleanup
    await cleanupTestAssets(testAssetIds);
    await prisma.$disconnect();
  }

  // Print Summary
  log.info('');
  log.info('============================================================');
  log.info('TEST SUMMARY');
  log.info('============================================================');
  
  const tests = [
    ['Server Health', results.serverHealth],
    ['Location Data', results.locationData],
    ['Categories Data', results.categoriesData],
    ['Asset Creation', results.assetCreation],
    ['Asset Update', results.assetUpdate],
    ['Asset Retrieval', results.assetRetrieval]
  ];

  let passedTests = 0;
  tests.forEach(([testName, result]) => {
    if (result && result.success) {
      log.success(`${testName}: ✅ PASS`);
      passedTests++;
    } else if (result) {
      log.error(`${testName}: ❌ FAIL`);
    } else {
      log.warning(`${testName}: ⏭️ SKIPPED`);
    }
  });

  log.info('');
  log.info(`Overall Result: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    log.success('🎉 All tests passed! Frontend functionality should work correctly.');
  } else {
    log.warning('⚠️ Some tests failed. Check the logs above for details.');
  }

  // Specific recommendations
  log.info('');
  log.info('RECOMMENDATIONS:');
  if (results.locationData && results.locationData.count === 0) {
    log.info('- Location dropdown is empty because no active locations exist in database');
    log.info('- Add active locations to database or check location status');
  }
  if (results.categoriesData && results.categoriesData.count === 0) {
    log.info('- Category dropdown will be empty because no active categories exist');
  }
  if (results.assetCreation && results.assetCreation.success) {
    log.info('- Asset creation works correctly at database level');
    log.info('- Frontend asset creation should work if authentication is resolved');
  }
}

// Run tests if script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testLocationDataDirect,
  testCategoriesDataDirect,
  testAssetCreationDirect,
  runTests
};
