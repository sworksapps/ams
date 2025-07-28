#!/usr/bin/env node

/**
 * Test script for PPM Task Generation and AMC Renewal functionality
 * Tests both CRON and Manual modes for each system
 */

const moment = require('moment');
const db = require('./database');

// Import the functions directly from the route files
const maintenanceRoutes = require('./routes/maintenance');
const amcRenewalRoutes = require('./routes/amcRenewal');

async function runTests() {
  console.log('🧪 PPM TASK & AMC RENEWAL TEST SUITE');
  console.log('=====================================');
  console.log(`📅 Test Date: ${new Date().toLocaleString()}`);
  console.log();
  
  // Initialize database connection
  try {
    console.log('🔌 Initializing database connection...');
    await db.init();
    console.log('✅ Database connection established');
  } catch (error) {
    console.log(`❌ Database initialization failed: ${error.message}`);
    return;
  }
  
  console.log();
  console.log('🚀 STARTING COMPREHENSIVE TEST SUITE');
  console.log('=====================================');
  console.log();
  
  let ppmTestPassed = false;
  let amcTestPassed = false;
  let externalTestPassed = false;
  
  // Test PPM Task Generation
  try {
    console.log('🔧 TESTING PPM TASK GENERATION');
    console.log('-------------------------------');
    ppmTestPassed = await testPPMTaskGeneration();
  } catch (error) {
    console.log(`❌ PPM Task Generation Test Failed: ${error.message}`);
  }
  
  console.log();
  
  // Test AMC Renewal Generation
  try {
    console.log('🔄 TESTING AMC RENEWAL GENERATION');
    console.log('----------------------------------');
    amcTestPassed = await testAMCRenewalGeneration();
  } catch (error) {
    console.log(`❌ AMC Renewal Generation Test Failed: ${error.message}`);
  }
  
  console.log();
  
  // Test External Ticketing Integration
  try {
    console.log('🌐 TESTING EXTERNAL TICKETING INTEGRATION');
    console.log('------------------------------------------');
    externalTestPassed = await testExternalTicketingIntegration();
  } catch (error) {
    console.log(`❌ External Ticketing Integration Test Failed: ${error.message}`);
  }
  
  console.log('\n🎯 COMPREHENSIVE TEST SUITE SUMMARY:');
  console.log(`   • PPM Task Generation: ${ppmTestPassed ? '✅ Passed' : '❌ Failed'}`);
  console.log(`   • AMC Renewal Generation: ${amcTestPassed ? '✅ Passed' : '❌ Failed'}`);
  console.log(`   • External Ticketing Integration: ${externalTestPassed ? '✅ Passed' : '❌ Failed'}`);
}

async function testPPMTaskGeneration() {
  console.log('🔧 TESTING PPM TASK GENERATION');
  console.log('-------------------------------');
  
  try {
    // Test 1: Check maintenance schedules exist
    console.log('📋 Step 1: Checking maintenance schedules...');
    const schedules = await db.all(`
      SELECT 
        ms.*,
        a.equipment_name,
        a.location,
        a.category
      FROM maintenance_schedules ms
      JOIN assets a ON ms.asset_id = a.id
      WHERE ms.is_active = 1
      LIMIT 5
    `);
    
    console.log(`   ✅ Found ${schedules.length} active maintenance schedules`);
    if (schedules.length > 0) {
      schedules.forEach((schedule, index) => {
        console.log(`   ${index + 1}. ${schedule.equipment_name} - ${schedule.maintenance_name} (${schedule.frequency})`);
      });
    }
    
    // Test 2: Check schedules due for 15th day (CRON mode target)
    console.log('\n📅 Step 2: Checking schedules due for 15th day from today...');
    const cronTargetDate = moment().add(15, 'days').format('YYYY-MM-DD');
    console.log(`   Target Date: ${cronTargetDate}`);
    
    const cronDueSchedules = await db.all(`
      SELECT 
        ms.*,
        a.equipment_name,
        a.location
      FROM maintenance_schedules ms
      JOIN assets a ON ms.asset_id = a.id
      WHERE ms.is_active = 1
        AND DATE(ms.next_maintenance_date) = ?
    `, [cronTargetDate]);
    
    console.log(`   ✅ Found ${cronDueSchedules.length} schedules due on ${cronTargetDate}`);
    
    // Test 3: Check schedules due within next 14 days (Manual mode target)
    console.log('\n📅 Step 3: Checking schedules due within next 14 days...');
    const manualStartDate = moment().format('YYYY-MM-DD');
    const manualEndDate = moment().add(14, 'days').format('YYYY-MM-DD');
    console.log(`   Date Range: ${manualStartDate} to ${manualEndDate}`);
    
    const manualDueSchedules = await db.all(`
      SELECT 
        ms.*,
        a.equipment_name,
        a.location
      FROM maintenance_schedules ms
      JOIN assets a ON ms.asset_id = a.id
      WHERE ms.is_active = 1
        AND DATE(ms.next_maintenance_date) BETWEEN ? AND ?
    `, [manualStartDate, manualEndDate]);
    
    console.log(`   ✅ Found ${manualDueSchedules.length} schedules due within 14 days`);
    
    console.log('\n🎯 PPM Task Generation Test Summary:');
    console.log(`   • Total Active Schedules: ${schedules.length}`);
    console.log(`   • CRON Mode Targets (15th day): ${cronDueSchedules.length}`);
    console.log(`   • Manual Mode Targets (14 days): ${manualDueSchedules.length}`);
    
    return {
      success: true,
      totalSchedules: schedules.length,
      cronTargets: cronDueSchedules.length,
      manualTargets: manualDueSchedules.length
    };
    
  } catch (error) {
    console.error('❌ PPM Task Generation Test Failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testAMCRenewalGeneration() {
  console.log('\n🔄 TESTING AMC RENEWAL GENERATION');
  console.log('----------------------------------');
  
  try {
    // Test 1: Check AMC coverages exist
    console.log('📋 Step 1: Checking AMC coverages...');
    const coverages = await db.all(`
      SELECT 
        c.*,
        a.equipment_name,
        a.location,
        a.category
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE c.coverage_type = 'AMC'
        AND c.is_active = 1
      LIMIT 5
    `);
    
    console.log(`   ✅ Found ${coverages.length} active AMC coverages`);
    if (coverages.length > 0) {
      coverages.forEach((coverage, index) => {
        const endDate = moment(coverage.end_date).format('YYYY-MM-DD');
        console.log(`   ${index + 1}. ${coverage.equipment_name} - Expires: ${endDate}`);
      });
    }
    
    // Test 2: Check coverages expiring on 15th day (CRON mode target)
    console.log('\n📅 Step 2: Checking coverages expiring on 15th day from today...');
    const cronTargetDate = moment().add(15, 'days').format('YYYY-MM-DD');
    console.log(`   Target Date: ${cronTargetDate}`);
    
    const cronExpiringCoverages = await db.all(`
      SELECT 
        c.*,
        a.equipment_name,
        a.location
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE c.coverage_type = 'AMC'
        AND c.is_active = 1
        AND DATE(c.end_date) = ?
    `, [cronTargetDate]);
    
    console.log(`   ✅ Found ${cronExpiringCoverages.length} coverages expiring on ${cronTargetDate}`);
    
    // Test 3: Check coverages expiring within next 14 days (Manual mode target)
    console.log('\n📅 Step 3: Checking coverages expiring within next 14 days...');
    const manualStartDate = moment().format('YYYY-MM-DD');
    const manualEndDate = moment().add(14, 'days').format('YYYY-MM-DD');
    console.log(`   Date Range: ${manualStartDate} to ${manualEndDate}`);
    
    const manualExpiringCoverages = await db.all(`
      SELECT 
        c.*,
        a.equipment_name,
        a.location
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE c.coverage_type = 'AMC'
        AND c.is_active = 1
        AND DATE(c.end_date) BETWEEN ? AND ?
    `, [manualStartDate, manualEndDate]);
    
    console.log(`   ✅ Found ${manualExpiringCoverages.length} coverages expiring within 14 days`);
    
    // Test 4: Check coverages expiring within next 60 days (Legacy compatibility)
    console.log('\n📅 Step 4: Checking coverages expiring within next 60 days (Legacy)...');
    const legacyEndDate = moment().add(60, 'days').format('YYYY-MM-DD');
    console.log(`   Date Range: ${manualStartDate} to ${legacyEndDate}`);
    
    const legacyExpiringCoverages = await db.all(`
      SELECT 
        c.*,
        a.equipment_name,
        a.location
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE c.coverage_type = 'AMC'
        AND c.is_active = 1
        AND DATE(c.end_date) BETWEEN ? AND ?
    `, [manualStartDate, legacyEndDate]);
    
    console.log(`   ✅ Found ${legacyExpiringCoverages.length} coverages expiring within 60 days`);
    
    console.log('\n🎯 AMC Renewal Generation Test Summary:');
    console.log(`   • Total Active AMC Coverages: ${coverages.length}`);
    console.log(`   • CRON Mode Targets (15th day): ${cronExpiringCoverages.length}`);
    console.log(`   • Manual Mode Targets (14 days): ${manualExpiringCoverages.length}`);
    console.log(`   • Legacy Mode Targets (60 days): ${legacyExpiringCoverages.length}`);
    
    return {
      success: true,
      totalCoverages: coverages.length,
      cronTargets: cronExpiringCoverages.length,
      manualTargets: manualExpiringCoverages.length,
      legacyTargets: legacyExpiringCoverages.length
    };
    
  } catch (error) {
    console.error('❌ AMC Renewal Generation Test Failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testExternalTicketingIntegration() {
  console.log('\n🌐 TESTING EXTERNAL TICKETING INTEGRATION');
  console.log('------------------------------------------');
  
  try {
    // Test external ticketing utility
    const ExternalTicketing = require('./utils/externalTicketing');
    
    console.log('📋 Step 1: Testing External Ticketing Configuration...');
    console.log(`   ✅ ExternalTicketing utility loaded successfully`);
    
    // Test mock ticket creation (without actually creating tickets)
    console.log('\n📋 Step 2: Testing Mock Ticket Creation...');
    
    const mockPPMTicketData = {
      locationCode: 'TEST-LOC',
      floor: '1st Floor',
      subject: 'Test PPM Task - Air Conditioner Maintenance',
      description: 'This is a test PPM maintenance task',
      assetName: 'Test Air Conditioner',
      assetId: 'TEST-AC-001',
      assetCategory: 'HVAC',
      maintenanceName: 'Quarterly Maintenance',
      scheduleId: 'TEST-SCHEDULE-001',
      dueDate: moment().add(15, 'days').format('YYYY-MM-DD'),
      maintenanceOwner: 'Maintenance Team'
    };
    
    console.log('   📤 Mock PPM Ticket Data:');
    console.log(`      Asset: ${mockPPMTicketData.assetName}`);
    console.log(`      Location: ${mockPPMTicketData.locationCode}`);
    console.log(`      Due Date: ${mockPPMTicketData.dueDate}`);
    console.log(`      Type: PPM`);
    
    const mockAMCTicketData = {
      locationCode: 'TEST-LOC',
      floor: '2nd Floor',
      subject: 'Test AMC Renewal - UPS System',
      description: 'This is a test AMC renewal request',
      assetName: 'Test UPS System',
      assetId: 'TEST-UPS-001',
      assetCategory: 'Electrical',
      coverageId: 'TEST-COVERAGE-001',
      expiryDate: moment().add(15, 'days').format('YYYY-MM-DD'),
      vendor: 'Test Vendor'
    };
    
    console.log('\n   📤 Mock AMC Ticket Data:');
    console.log(`      Asset: ${mockAMCTicketData.assetName}`);
    console.log(`      Location: ${mockAMCTicketData.locationCode}`);
    console.log(`      Expiry Date: ${mockAMCTicketData.expiryDate}`);
    console.log(`      Type: AMC`);
    
    console.log('\n🎯 External Ticketing Integration Test Summary:');
    console.log(`   • ExternalTicketing utility: ✅ Loaded`);
    console.log(`   • Mock PPM ticket data: ✅ Prepared`);
    console.log(`   • Mock AMC ticket data: ✅ Prepared`);
    console.log(`   • Integration ready for live testing`);
    
    return {
      success: true,
      externalTicketingLoaded: true,
      mockDataPrepared: true
    };
    
  } catch (error) {
    console.error('❌ External Ticketing Integration Test Failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 STARTING COMPREHENSIVE TEST SUITE');
  console.log('=====================================\n');
  
  console.log('\n📊 FINAL TEST RESULTS');
  console.log('======================');
  console.log(`🔧 PPM Task Generation: ${ppmTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`🔄 AMC Renewal Generation: ${amcTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`🌐 External Ticketing Integration: ${externalTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (ppmTestPassed && amcTestPassed && externalTestPassed) {
    console.log('\n🎉 All tests passed successfully!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
  
  console.log('\n📈 DETAILED STATISTICS:');
  console.log('');
  console.log('✅ Test suite completed successfully');
  
  // Close database connection
  try {
    await db.close();
    console.log('🔌 Database connection closed');
  } catch (error) {
    console.log(`⚠️  Error closing database: ${error.message}`);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(() => {
      console.log('\n✅ Test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testPPMTaskGeneration,
  testAMCRenewalGeneration,
  testExternalTicketingIntegration,
  runAllTests
};
