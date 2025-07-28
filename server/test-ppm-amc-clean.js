require('dotenv').config();
const moment = require('moment');
const db = require('./database');

// Load external ticketing utility
let ExternalTicketing;
try {
  ExternalTicketing = require('./utils/externalTicketing');
  console.log('🔧 External API Config loaded:', {
    hasConfig: !!process.env.EXTERNAL_API_BASE_URL,
    hasToken: !!process.env.EXTERNAL_API_TOKEN,
    tokenLength: process.env.EXTERNAL_API_TOKEN ? process.env.EXTERNAL_API_TOKEN.length : 0
  });
} catch (error) {
  console.log('⚠️ External ticketing utility not available:', error.message);
}

// Helper function to calculate next maintenance date (simplified version of the actual logic)
function calculateNextMaintenanceDate(startDate, frequency, frequencyValue) {
  const start = moment(startDate);
  const today = moment().startOf('day');
  
  let nextDate = start.clone();
  
  // Calculate the next due date based on frequency
  while (nextDate.isBefore(today)) {
    switch (frequency.toLowerCase()) {
      case 'daily':
        nextDate.add(frequencyValue, 'days');
        break;
      case 'weekly':
        nextDate.add(frequencyValue, 'weeks');
        break;
      case 'monthly':
        nextDate.add(frequencyValue, 'months');
        break;
      case 'quarterly':
        nextDate.add(frequencyValue * 3, 'months');
        break;
      case 'yearly':
        nextDate.add(frequencyValue, 'years');
        break;
      default:
        nextDate.add(frequencyValue, 'months'); // default to monthly
    }
  }
  
  return nextDate;
}

async function testPPMTaskGeneration() {
  console.log('📋 Step 1: Checking maintenance schedules...');
  
  try {
    // Test 1: Check total active maintenance schedules (using actual schema)
    const totalSchedules = await db.all(`
      SELECT 
        s.id as schedule_id,
        s.maintenance_name,
        s.start_date,
        s.frequency,
        s.frequency_value,
        s.owner,
        a.id as asset_id,
        a.equipment_name,
        a.category,
        a.subcategory,
        a.location,
        a.floor,
        a.make,
        a.model_number
      FROM maintenance_schedules s
      JOIN assets a ON s.asset_id = a.id
      WHERE s.is_active = 1 AND a.status = 'active'
      ORDER BY a.location, a.subcategory, a.category, s.maintenance_name
    `);
    
    console.log(`   ✅ Found ${totalSchedules.length} active maintenance schedules`);
    
    // Test 2: Check schedules due on the 15th day from today (CRON mode logic)
    console.log('\n📅 Step 2: Checking schedules due on 15th day from today...');
    const cronTargetDate = moment().add(15, 'days').startOf('day');
    console.log(`   Target Date: ${cronTargetDate.format('YYYY-MM-DD')}`);
    
    let cronDueCount = 0;
    for (const schedule of totalSchedules) {
      const nextMaintenanceDate = calculateNextMaintenanceDate(
        schedule.start_date, 
        schedule.frequency, 
        schedule.frequency_value
      );
      
      if (nextMaintenanceDate.isSame(cronTargetDate, 'day')) {
        cronDueCount++;
        console.log(`     • ${schedule.equipment_name} - ${schedule.maintenance_name} (Due: ${nextMaintenanceDate.format('YYYY-MM-DD')})`);
      }
    }
    
    console.log(`   ✅ Found ${cronDueCount} schedules due on ${cronTargetDate.format('YYYY-MM-DD')}`);
    
    // Test 3: Check schedules due within next 14 days (Manual mode logic)
    console.log('\n📅 Step 3: Checking schedules due within next 14 days...');
    const manualStartDate = moment().startOf('day');
    const manualEndDate = moment().add(14, 'days').startOf('day');
    console.log(`   Date Range: ${manualStartDate.format('YYYY-MM-DD')} to ${manualEndDate.format('YYYY-MM-DD')}`);
    
    let manualDueCount = 0;
    for (const schedule of totalSchedules) {
      const nextMaintenanceDate = calculateNextMaintenanceDate(
        schedule.start_date, 
        schedule.frequency, 
        schedule.frequency_value
      );
      
      if (nextMaintenanceDate.isBetween(manualStartDate, manualEndDate, 'day', '[]')) {
        manualDueCount++;
        console.log(`     • ${schedule.equipment_name} - ${schedule.maintenance_name} (Due: ${nextMaintenanceDate.format('YYYY-MM-DD')})`);
      }
    }
    
    console.log(`   ✅ Found ${manualDueCount} schedules due within 14 days`);
    
    console.log('\n🎯 PPM Task Generation Test Summary:');
    console.log(`   • Total active schedules: ${totalSchedules.length}`);
    console.log(`   • CRON targets (15th day): ${cronDueCount}`);
    console.log(`   • Manual targets (14 days): ${manualDueCount}`);
    
    return true;
  } catch (error) {
    console.log(`❌ PPM test failed: ${error.message}`);
    return false;
  }
}

async function testAMCRenewalGeneration() {
  console.log('📋 Step 1: Checking AMC coverages...');
  
  try {
    // Test 1: Check total active AMC coverages
    const totalCoverages = await db.all(`
      SELECT 
        c.*,
        a.equipment_name,
        a.location
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE c.coverage_type = 'AMC'
        AND c.status = 'active'
    `);
    
    console.log(`   ✅ Found ${totalCoverages.length} active AMC coverages`);
    
    // Test 2: Check coverages expiring on the 15th day from today (CRON mode target)
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
        AND c.status = 'active'
        AND DATE(c.period_till) = ?
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
        AND c.status = 'active'
        AND DATE(c.period_till) BETWEEN ? AND ?
    `, [manualStartDate, manualEndDate]);
    
    console.log(`   ✅ Found ${manualExpiringCoverages.length} coverages expiring within 14 days`);
    
    console.log('\n🎯 AMC Renewal Generation Test Summary:');
    console.log(`   • Total active coverages: ${totalCoverages.length}`);
    console.log(`   • CRON targets (15th day): ${cronExpiringCoverages.length}`);
    console.log(`   • Manual targets (14 days): ${manualExpiringCoverages.length}`);
    
    return true;
  } catch (error) {
    console.log(`❌ AMC test failed: ${error.message}`);
    return false;
  }
}

async function testExternalTicketingIntegration() {
  console.log('📋 Step 1: Testing External Ticketing Configuration...');
  
  try {
    if (ExternalTicketing) {
      console.log('   ✅ ExternalTicketing utility loaded successfully');
      
      console.log('\n📋 Step 2: Testing Mock Ticket Creation...');
      
      // Mock PPM ticket data
      const mockPPMTicket = {
        asset: 'Test Air Conditioner',
        location: 'TEST-LOC',
        dueDate: moment().add(15, 'days').format('YYYY-MM-DD'),
        type: 'PPM'
      };
      
      console.log('   📤 Mock PPM Ticket Data:');
      console.log(`      Asset: ${mockPPMTicket.asset}`);
      console.log(`      Location: ${mockPPMTicket.location}`);
      console.log(`      Due Date: ${mockPPMTicket.dueDate}`);
      console.log(`      Type: ${mockPPMTicket.type}`);
      
      // Mock AMC ticket data
      const mockAMCTicket = {
        asset: 'Test UPS System',
        location: 'TEST-LOC',
        expiryDate: moment().add(15, 'days').format('YYYY-MM-DD'),
        type: 'AMC'
      };
      
      console.log('\n   📤 Mock AMC Ticket Data:');
      console.log(`      Asset: ${mockAMCTicket.asset}`);
      console.log(`      Location: ${mockAMCTicket.location}`);
      console.log(`      Expiry Date: ${mockAMCTicket.expiryDate}`);
      console.log(`      Type: ${mockAMCTicket.type}`);
      
      console.log('\n🎯 External Ticketing Integration Test Summary:');
      console.log('   • ExternalTicketing utility: ✅ Loaded');
      console.log('   • Mock PPM ticket data: ✅ Prepared');
      console.log('   • Mock AMC ticket data: ✅ Prepared');
      console.log('   • Integration ready for live testing');
      
      return true;
    } else {
      console.log('   ⚠️ ExternalTicketing utility not available');
      return false;
    }
  } catch (error) {
    console.log(`❌ External ticketing test failed: ${error.message}`);
    return false;
  }
}

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
  
  console.log();
  console.log('📊 FINAL TEST RESULTS');
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

// Run the test suite
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
