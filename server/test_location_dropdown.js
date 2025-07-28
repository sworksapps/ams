#!/usr/bin/env node

/**
 * Simple Location Dropdown Test
 * Tests location data directly using the existing database service
 */

const database = require('./database');

async function testLocationDropdown() {
  console.log('🔍 Testing Location Dropdown Data...');
  console.log('=====================================');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const healthCheck = await database.healthCheck();
    console.log(`   Database health: ${healthCheck.status}`);

    if (healthCheck.status !== 'healthy') {
      console.error('❌ Database is not healthy, cannot proceed');
      return;
    }

    // Test locations data using database service method
    console.log('\n2. Testing locations data...');
    let locations = [];
    try {
      locations = await database.getLocations();
    } catch (error) {
      console.log(`   Error getting locations: ${error.message}`);
      // Try direct Prisma access
      try {
        locations = await database.prisma.location.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            address: true,
            isActive: true
          },
          orderBy: { name: 'asc' }
        });
      } catch (prismaError) {
        console.log(`   Prisma error: ${prismaError.message}`);
      }
    }

    console.log(`   Found ${locations.length} active locations:`);
    locations.forEach((loc, index) => {
      console.log(`   ${index + 1}. ${loc.name} (ID: ${loc.id}, Floor: ${loc.floor || 'N/A'})`);
    });

    if (locations.length === 0) {
      console.log('\n   ⚠️  No active locations found! Checking all locations...');
      
      const allLocations = await database.prisma.location.findMany({
        select: {
          id: true,
          name: true,
          isActive: true
        }
      });
      
      console.log(`   Total locations in database: ${allLocations.length}`);
      if (allLocations.length > 0) {
        console.log('   Sample locations:');
        allLocations.slice(0, 5).forEach(loc => {
          console.log(`     - ${loc.name} (Active: ${loc.isActive})`);
        });
      }
    }

    // Test categories data
    console.log('\n3. Testing categories data...');
    let categories = [];
    try {
      categories = await database.getCategories();
    } catch (error) {
      console.log(`   Error getting categories: ${error.message}`);
      // Try direct Prisma access
      try {
        categories = await database.prisma.category.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            isActive: true
          },
          orderBy: { name: 'asc' }
        });
      } catch (prismaError) {
        console.log(`   Prisma error: ${prismaError.message}`);
      }
    }

    console.log(`   Found ${categories.length} active categories:`);
    categories.slice(0, 10).forEach((cat, index) => {
      console.log(`   ${index + 1}. ${cat.name} (ID: ${cat.id})`);
    });

    // Test what the API endpoint should return
    console.log('\n4. Testing API endpoint format...');
    const locationDropdownData = locations.map(loc => ({
      value: loc.name,
      label: loc.name,
      id: loc.id,
      floor: loc.floor
    }));

    console.log('   Location dropdown data format:');
    console.log(JSON.stringify(locationDropdownData.slice(0, 3), null, 2));

    // Summary
    console.log('\n=====================================');
    console.log('📊 SUMMARY:');
    console.log(`   ✅ Database connection: ${healthCheck.status}`);
    console.log(`   📍 Active locations: ${locations.length}`);
    console.log(`   📂 Active categories: ${categories.length}`);
    
    if (locations.length === 0) {
      console.log('\n🚨 ROOT CAUSE IDENTIFIED:');
      console.log('   The location dropdown is empty because there are no active locations in the database!');
      console.log('   This explains why the frontend dropdown shows no options.');
    } else {
      console.log('\n✅ LOCATION DATA AVAILABLE:');
      console.log('   Location data exists and should populate the dropdown.');
      console.log('   If dropdown is still empty, check frontend authentication or API calls.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await database.close();
  }
}

// Run the test
testLocationDropdown().catch(console.error);
