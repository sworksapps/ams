const express = require('express');
const moment = require('moment');
const db = require('../database');
const ExternalTicketing = require('../utils/externalTicketing');


const router = express.Router();

/**
 * Get AMC coverages expiring within next 60 days (LEGACY - kept for compatibility)
 */
async function getExpiringCoverages() {
  try {
    const next60Days = moment().add(60, 'days').format('YYYY-MM-DD');
    const today = moment().format('YYYY-MM-DD');

    const sql = `
      SELECT 
        c.*,
        a.equipment_name,
        a.category,
        a.location,
        a.floor
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE c.end_date BETWEEN ? AND ?
        AND c.coverage_type = 'AMC'
        AND c.is_active = 1
      ORDER BY c.end_date ASC
    `;

    const coverages = await db.all(sql, [today, next60Days]);
    console.log(`📋 Found ${coverages.length} AMC coverages expiring within 60 days`);
    
    return coverages;
  } catch (error) {
    console.error('❌ Error fetching expiring coverages:', error);
    return [];
  }
}

/**
 * Generate AMC renewal tickets for CRON mode - creates tickets for 15th day from today without duplicate checks
 */
async function generateAmcRenewalTicketsCron() {
  console.log('🤖 AMC Renewal Ticket Generation Started - CRON MODE');
  console.log('📋 Target: 15th day from today (no duplicate checks)');
  
  const today = moment().startOf('day');
  const targetDate = moment().add(15, 'days').startOf('day');
  
  console.log(`📅 Target Date: ${targetDate.format('YYYY-MM-DD')}`);
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];
  
  try {
    // Get AMC coverages expiring exactly on the 15th day from today
    const sql = `
      SELECT 
        c.*,
        a.equipment_name,
        a.category,
        a.subcategory,
        a.location,
        a.location_code,
        a.floor
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE DATE(c.end_date) = ?
        AND c.coverage_type = 'AMC'
        AND c.is_active = 1
      ORDER BY a.location, a.category, a.equipment_name
    `;

    const coverages = await db.all(sql, [targetDate.format('YYYY-MM-DD')]);
    console.log(`📊 Found ${coverages.length} AMC coverages expiring on target date`);
    
    for (const coverage of coverages) {
      console.log(`\n🔍 Processing: ${coverage.equipment_name} - AMC Expiry: ${moment(coverage.end_date).format('YYYY-MM-DD')}`);
      
      // Create ticket without duplicate checks (cron mode)
      const result = await createAmcRenewalTicket(coverage, 'CRON');
      
      if (result.success && !result.skipped) {
        created++;
        console.log(`✅ AMC renewal ticket created successfully: ${result.ticketNumber}`);
        results.push({
          coverageId: coverage.id,
          equipmentName: coverage.equipment_name,
          ticketNumber: result.ticketNumber,
          status: 'created',
          expiryDate: moment(coverage.end_date).format('YYYY-MM-DD')
        });
      } else if (result.skipped) {
        skipped++;
        console.log(`⏭️ AMC renewal ticket skipped: ${result.reason}`);
        results.push({
          coverageId: coverage.id,
          equipmentName: coverage.equipment_name,
          status: 'skipped',
          reason: result.reason,
          expiryDate: moment(coverage.end_date).format('YYYY-MM-DD')
        });
      } else {
        failed++;
        console.log(`❌ Failed to create AMC renewal ticket: ${result.error}`);
        results.push({
          coverageId: coverage.id,
          equipmentName: coverage.equipment_name,
          status: 'failed',
          reason: result.error,
          expiryDate: moment(coverage.end_date).format('YYYY-MM-DD')
        });
      }
    }
    
    console.log(`\n🎯 CRON AMC Renewal Generation Summary:`);
    console.log(`✅ Tickets Created: ${created}`);
    console.log(`⏭️ Tickets Skipped: ${skipped}`);
    console.log(`❌ Tickets Failed: ${failed}`);
    
    return {
      created,
      skipped,
      failed,
      results,
      mode: 'CRON'
    };
    
  } catch (error) {
    console.error('❌ Error in generateAmcRenewalTicketsCron:', error);
    throw error;
  }
}

/**
 * Generate AMC renewal tickets for MANUAL mode - checks existing tickets within 14-day window
 */
async function generateAmcRenewalTicketsManual() {
  console.log('🔧 AMC Renewal Ticket Generation Started - MANUAL MODE');
  console.log('📋 Target: Next 14 days (with duplicate checks)');
  
  const today = moment().startOf('day');
  const endDate = moment().add(14, 'days').endOf('day');
  
  console.log(`📅 Date Range: ${today.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const results = [];
  
  try {
    // First, fetch existing AMC tickets to check for duplicates
    console.log('🔍 Fetching existing AMC tickets for deduplication...');
    const existingTickets = new Set();
    
    try {
      const ticketResult = await ExternalTicketing.fetchTickets({
        type: 'AMC',
        filters: {
          dateRange: {
            start: today.format('YYYY-MM-DD'),
            end: endDate.format('YYYY-MM-DD')
          }
        }
      });
      
      if (ticketResult.success && ticketResult.data) {
        ticketResult.data.forEach(ticket => {
          const key = `${ticket.assetId}_${moment(ticket.dueDate).format('YYYY-MM-DD')}`;
          existingTickets.add(key);
        });
        console.log(`🔑 Found ${existingTickets.size} existing AMC tickets for deduplication`);
      } else {
        console.warn('⚠️ Could not fetch existing AMC tickets, proceeding without duplicate checks');
      }
    } catch (apiError) {
      console.warn('⚠️ Error fetching existing AMC tickets:', apiError.message);
      console.warn('⚠️ Proceeding without duplicate checks');
    }
    
    // Get AMC coverages expiring within the next 14 days
    const sql = `
      SELECT 
        c.*,
        a.equipment_name,
        a.category,
        a.subcategory,
        a.location,
        a.location_code,
        a.floor
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE c.end_date BETWEEN ? AND ?
        AND c.coverage_type = 'AMC'
        AND c.is_active = 1
      ORDER BY c.end_date ASC, a.location, a.category, a.equipment_name
    `;

    const coverages = await db.all(sql, [today.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]);
    console.log(`📊 Found ${coverages.length} AMC coverages expiring within 14-day window`);
    
    for (const coverage of coverages) {
      console.log(`\n🔍 Processing: ${coverage.equipment_name} - AMC Expiry: ${moment(coverage.end_date).format('YYYY-MM-DD')}`);
      
      // Check for duplicate tickets before creating
      const duplicateKey = `${coverage.asset_id}_${moment(coverage.end_date).format('YYYY-MM-DD')}`;
      
      if (existingTickets.has(duplicateKey)) {
        console.log(`⏭️ Skipping - duplicate AMC ticket already exists: ${duplicateKey}`);
        skipped++;
        results.push({
          coverageId: coverage.id,
          equipmentName: coverage.equipment_name,
          status: 'skipped_duplicate',
          reason: 'AMC ticket already exists for this asset/expiry date',
          expiryDate: moment(coverage.end_date).format('YYYY-MM-DD')
        });
        continue;
      }
      
      // Create ticket with duplicate awareness
      const result = await createAmcRenewalTicket(coverage, 'MANUAL');
      
      if (result.success && !result.skipped) {
        created++;
        console.log(`✅ AMC renewal ticket created successfully: ${result.ticketNumber}`);
        results.push({
          coverageId: coverage.id,
          equipmentName: coverage.equipment_name,
          ticketNumber: result.ticketNumber,
          status: 'created',
          expiryDate: moment(coverage.end_date).format('YYYY-MM-DD')
        });
      } else if (result.skipped) {
        skipped++;
        console.log(`⏭️ AMC renewal ticket skipped: ${result.reason}`);
        results.push({
          coverageId: coverage.id,
          equipmentName: coverage.equipment_name,
          status: 'skipped',
          reason: result.reason,
          expiryDate: moment(coverage.end_date).format('YYYY-MM-DD')
        });
      } else {
        failed++;
        console.log(`❌ Failed to create AMC renewal ticket: ${result.error}`);
        results.push({
          coverageId: coverage.id,
          equipmentName: coverage.equipment_name,
          status: 'failed',
          reason: result.error,
          expiryDate: moment(coverage.end_date).format('YYYY-MM-DD')
        });
      }
    }
    
    console.log(`\n🎯 MANUAL AMC Renewal Generation Summary:`);
    console.log(`✅ Tickets Created: ${created}`);
    console.log(`⏭️ Tickets Skipped: ${skipped}`);
    console.log(`❌ Tickets Failed: ${failed}`);
    
    return {
      created,
      skipped,
      failed,
      results,
      mode: 'MANUAL'
    };
    
  } catch (error) {
    console.error('❌ Error in generateAmcRenewalTicketsManual:', error);
    throw error;
  }
}

/**
 * Create AMC renewal ticket for a coverage
 */
async function createAmcRenewalTicket(coverage, triggerType = 'CRON') {
  try {
    console.log(`🎫 AMC RENEWAL EXTERNAL TICKET INTEGRATION START`);
    console.log(`📋 Asset: ${coverage.equipment_name} | Coverage ID: ${coverage.id}`);
    console.log(`📅 Expiry Date: ${moment(coverage.end_date).format('YYYY-MM-DD')}`);
    
    // Get asset details for location code and subcategory
    const asset = await db.get(`
      SELECT id, equipment_name, category, subcategory, location, location_code, floor 
      FROM assets 
      WHERE id = ?
    `, [coverage.asset_id]);

    if (!asset) {
      console.log(`❌ Asset not found for coverage ${coverage.id}`);
      return { 
        success: false, 
        error: 'Asset not found',
        coverageId: coverage.id,
        equipmentName: coverage.equipment_name
      };
    }

    const dueDateFormatted = moment(coverage.end_date).format('YYYY-MM-DD');
    
    const ticketData = {
      locationCode: asset.location_code || asset.location,
      floor: asset.floor,
      subject: `${asset.equipment_name} requires AMC to be renewed.`,
      description: "",
      assetName: asset.equipment_name,
      assetId: asset.id,
      assetCategory: asset.category,
      assetSubCategory: asset.subcategory,
      dueDate: dueDateFormatted,
      coverageId: coverage.id
    };

    console.log('📤 Calling ExternalTicketing.createTicket with AMC data');

    const result = await ExternalTicketing.createTicket(
      ticketData,
      'AMC_RENEWAL',
      coverage.id,
      triggerType
    );

    if (result.success) {
      console.log(`✅ AMC Renewal ticket created successfully: ${result.ticketNumber}`);
      return { 
        success: true, 
        ticketNumber: result.ticketNumber,
        coverageId: coverage.id,
        equipmentName: coverage.equipment_name
      };
    } else {
      console.log(`❌ Failed to create AMC Renewal ticket for coverage ${coverage.id}: ${result.error}`);
      return { 
        success: false, 
        error: result.error,
        coverageId: coverage.id,
        equipmentName: coverage.equipment_name
      };
    }
  } catch (error) {
    console.error(`💥 Exception creating AMC Renewal ticket for coverage ${coverage.id}:`, error);
    return { 
      success: false, 
      error: error.message,
      coverageId: coverage.id,
      equipmentName: coverage.equipment_name || 'Unknown'
    };
  }
}

/**
 * Auto-generate AMC renewal tickets (for cron job) - creates tickets for 15th day from today
 */
router.post('/auto-generate', async (req, res) => {
  try {
    console.log(' AUTO-GENERATE AMC RENEWAL TICKETS - CRON JOB STARTED');
    const startTime = Date.now();

    // Use new cron mode function
    const result = await generateAmcRenewalTicketsCron();
    
    const executionTime = Date.now() - startTime;
    console.log(` CRON AMC RENEWAL SUMMARY: Created: ${result.created}, Skipped: ${result.skipped}, Failed: ${result.failed} (${executionTime}ms)`);

    res.json({
      success: true,
      message: `AMC renewal tickets auto-generation completed`,
      created: result.created,
      skipped: result.skipped,
      failed: result.failed,
      executionTime,
      mode: result.mode,
      results: result.results
    });

  } catch (error) {
    console.error(' AUTO-GENERATE AMC RENEWAL FAILED:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      created: 0,
      skipped: 0,
      failed: 0
    });
  }
});

/**
 * Manual generate AMC renewal tickets (admin override) - checks existing tickets within 14-day window
 */
router.post('/manual-generate', async (req, res) => {
  try {
    console.log('👤 MANUAL GENERATE AMC RENEWAL TICKETS - ADMIN OVERRIDE STARTED');
    const startTime = Date.now();

    // Use new manual mode function with 14-day window and duplicate checks
    const result = await generateAmcRenewalTicketsManual();
    
    const executionTime = Date.now() - startTime;
    console.log(`🎯 MANUAL AMC RENEWAL SUMMARY: Created: ${result.created}, Skipped: ${result.skipped}, Failed: ${result.failed} (${executionTime}ms)`);

    res.json({
      success: true,
      message: `AMC renewal tickets manual generation completed`,
      created: result.created,
      skipped: result.skipped,
      failed: result.failed,
      executionTime,
      mode: result.mode,
      results: result.results
    });

  } catch (error) {
    console.error('💥 MANUAL GENERATE AMC RENEWAL FAILED:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      created: 0,
      skipped: 0,
      failed: 0
    });
  }
});

/**
 * Get AMC renewal tickets from external system
 */
router.get('/external-tickets', async (req, res) => {
  try {
    const { view = 'open', page = 1, limit = 10 } = req.query;
    
    const result = await ExternalTicketing.fetchTickets({
      type: 'AMC',
      view,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (result.success) {
      // Transform data to match frontend expectations
      const transformedData = result.data.map(ticket => ({
        ticketNumber: ticket.ticketNumber || ticket.id,
        locationShortCode: ticket.locationShortCode || ticket.location,
        category: ticket.category,
        status: ticket.status,
        pendingWith: ticket.pendingWith || 'N/A',
        createdAt: ticket.createdAt || ticket.created_at,
        dueDate: ticket.dueDate || ticket.due_date
      }));

      res.json({
        success: true,
        data: transformedData,
        totalCount: result.totalCount
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        data: [],
        totalCount: 0
      });
    }
  } catch (error) {
    console.error('❌ Error fetching external AMC tickets:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: [],
      totalCount: 0
    });
  }
});

/**
 * Get AMC renewal KPIs from external system
 */
router.get('/kpis', async (req, res) => {
  try {
    console.log('📊 Fetching AMC renewal KPIs from external API');
    const result = await ExternalTicketing.fetchKPIs('AMC');
    
    if (result.success) {
      res.json({
        success: true,
        data: result.kpis
      });
    } else {
      res.json({
        success: true,
        data: {
          totalTickets: 0,
          openTickets: 0,
          criticalTickets: 0,
          pastDueTickets: 0,
          closedTickets: 0
        }
      });
    }
  } catch (error) {
    console.error('❌ Error fetching AMC KPIs:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        totalTickets: 0,
        openTickets: 0,
        criticalTickets: 0,
        pastDueTickets: 0,
        closedTickets: 0
      }
    });
  }
});

/**
 * Get status options for AMC renewal tickets from external system
 */
router.get('/status-options', async (req, res) => {
  try {
    console.log('🔍 Fetching AMC renewal status options from external API');
    
    const result = await ExternalTicketing.fetchStatusOptions('AMC');
    
    if (result.success) {
      // Transform the response to match frontend expectations
      const statusOptions = (result.data || []).map(status => ({
        value: status.value || status,
        label: status.label || status
      }));
      
      res.json({
        success: true,
        data: statusOptions
      });
    } else {
      res.json({
        success: true,
        data: []
      });
    }
  } catch (error) {
    console.error('❌ Error fetching AMC status options:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * Get location options for AMC renewal tickets from external system
 */
router.get('/location-options', async (req, res) => {
  try {
    console.log('🔍 Fetching location options for AMC renewal filter');
    const CentralLocationService = require('../utils/centralLocationService');
    const result = await CentralLocationService.fetchLocations();
    
    if (result.success) {
      const locationOptions = CentralLocationService.transformLocationOptions(result.data);
      
      res.json({
        success: true,
        data: locationOptions
      });
    } else {
      console.error('❌ Failed to fetch location options:', result.error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch location options from central service'
      });
    }
  } catch (error) {
    console.error('💥 Exception in location-options endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get expiring coverages (for manual review)
 */
router.get('/expiring-coverages', async (req, res) => {
  try {
    const coverages = await getExpiringCoverages();
    res.json({
      success: true,
      data: coverages,
      count: coverages.length
    });
  } catch (error) {
    console.error('❌ Error fetching expiring coverages:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: [],
      count: 0
    });
  }
});

module.exports = router;
