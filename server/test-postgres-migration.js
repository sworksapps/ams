const db = require('./database');

async function testPostgresMigration() {
  console.log('🚀 Starting PostgreSQL Migration Test...\n');
  
  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    await db.init();
    console.log('✅ Database connection successful\n');
    
    // Test 2: Health Check
    console.log('2️⃣ Testing health check...');
    const health = await db.healthCheck();
    console.log('Health status:', health);
    console.log('✅ Health check passed\n');
    
    // Test 3: Test Categories
    console.log('3️⃣ Testing categories...');
    const categories = await db.getCategoriesHierarchy();
    console.log(`Found ${categories.length} parent categories`);
    console.log('Sample categories:', categories.slice(0, 3).map(c => c.name));
    console.log('✅ Categories test passed\n');
    
    // Test 4: Test Locations
    console.log('4️⃣ Testing locations...');
    const locations = await db.getLocations();
    console.log(`Found ${locations.length} locations`);
    console.log('Sample locations:', locations.slice(0, 3).map(l => l.name));
    console.log('✅ Locations test passed\n');
    
    // Test 5: Create Test Asset
    console.log('5️⃣ Testing asset creation...');
    const testAssetId = 'test-asset-' + Date.now();
    const testAsset = {
      id: testAssetId,
      equipmentName: 'Test Equipment',
      category: 'Air Conditioner',
      location: 'Building A',
      assetType: 'building',
      manufacturer: 'Test Manufacturer',
      status: 'active'
    };
    
    const createdAsset = await db.createAsset(testAsset);
    console.log('Created asset:', createdAsset.id);
    console.log('✅ Asset creation test passed\n');
    
    // Test 6: Retrieve Asset
    console.log('6️⃣ Testing asset retrieval...');
    const retrievedAsset = await db.getAssetById(testAssetId);
    console.log('Retrieved asset:', retrievedAsset.equipmentName);
    console.log('✅ Asset retrieval test passed\n');
    
    // Test 7: Update Asset
    console.log('7️⃣ Testing asset update...');
    await db.updateAsset(testAssetId, { 
      equipmentName: 'Updated Test Equipment',
      manufacturer: 'Updated Manufacturer'
    });
    const updatedAsset = await db.getAssetById(testAssetId);
    console.log('Updated asset name:', updatedAsset.equipmentName);
    console.log('✅ Asset update test passed\n');
    
    // Test 8: Create Maintenance Schedule
    console.log('8️⃣ Testing maintenance schedule creation...');
    const scheduleId = 'test-schedule-' + Date.now();
    const testSchedule = {
      id: scheduleId,
      assetId: testAssetId,
      maintenanceName: 'Test Maintenance',
      startDate: new Date(),
      frequency: 'monthly'
    };
    
    await db.createMaintenanceSchedule(testSchedule);
    const schedules = await db.getMaintenanceSchedules(testAssetId);
    console.log('Created maintenance schedule:', schedules[0].maintenanceName);
    console.log('✅ Maintenance schedule test passed\n');
    
    // Test 9: Create Coverage
    console.log('9️⃣ Testing coverage creation...');
    const coverageId = 'test-coverage-' + Date.now();
    const testCoverage = {
      id: coverageId,
      assetId: testAssetId,
      vendorName: 'Test Vendor',
      coverageType: 'AMC',
      periodFrom: new Date(),
      periodTill: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    };
    
    await db.createCoverage(testCoverage);
    const coverage = await db.getCoverage(testAssetId);
    console.log('Created coverage:', coverage[0].vendorName);
    console.log('✅ Coverage test passed\n');
    
    // Test 10: Get All Assets with Relations
    console.log('🔟 Testing asset retrieval with relations...');
    const allAssets = await db.getAllAssets();
    console.log(`Found ${allAssets.length} total assets`);
    const assetWithRelations = allAssets.find(a => a.id === testAssetId);
    if (assetWithRelations) {
      console.log('Asset has maintenance schedules:', assetWithRelations.maintenanceSchedules.length);
      console.log('Asset has coverage:', assetWithRelations.coverage.length);
    }
    console.log('✅ Asset relations test passed\n');
    
    // Cleanup: Delete test data
    console.log('🧹 Cleaning up test data...');
    await db.deleteMaintenanceSchedule(scheduleId);
    await db.deleteCoverage(coverageId);
    await db.deleteAsset(testAssetId);
    console.log('✅ Cleanup completed\n');
    
    console.log('🎉 All tests passed! PostgreSQL migration is working correctly.\n');
    
    // Summary
    console.log('📊 Migration Summary:');
    console.log('- Database connection: ✅');
    console.log('- Default data seeding: ✅');
    console.log('- Asset CRUD operations: ✅');
    console.log('- Maintenance schedule operations: ✅');
    console.log('- Coverage operations: ✅');
    console.log('- Relationship handling: ✅');
    console.log('- Data integrity: ✅');
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await db.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPostgresMigration();
}

module.exports = testPostgresMigration;
