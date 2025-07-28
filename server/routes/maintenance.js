const express = require('express');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const db = require('../database');
const fetch = require('node-fetch');
const ExternalTicketing = require('../utils/externalTicketing');
const { EXTERNAL_API_CONFIG } = require('../utils/externalTicketing');

const { validate } = require('../middleware/validation');
const { maintenanceScheduleSchema, ppmTaskUpdateSchema, paginationSchema } = require('../validation/schemas');

// Fallback token in case EXTERNAL_API_CONFIG is undefined
const API_TOKEN = EXTERNAL_API_CONFIG?.token || '3F4SWORKS5H6J7K8L9N0P1Q2R3S4T5V6W7X8Y9Z0';

// Debug log to check if config is loaded properly
console.log('🔧 External API Config loaded:', {
  hasConfig: !!EXTERNAL_API_CONFIG,
  hasToken: !!(EXTERNAL_API_CONFIG?.token),
  tokenLength: EXTERNAL_API_CONFIG?.token?.length || 0
});

const router = express.Router();

// Helper function to convert frequency to CamelCase
function toCamelCase(str) {
  if (!str) return str;
  return str.split(/[\s_-]+/)
    .map((word, index) => {
      if (index === 0) {
        return word.charAt(0).toLowerCase() + word.slice(1).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

// External ticket creation function with enhanced logging
async function createExternalTicket(asset, schedule, maintenanceDate, triggerType = 'CRON') {
  try {
    console.log('🎫 PPM EXTERNAL TICKET INTEGRATION START');
    console.log('📋 Asset:', asset.equipment_name, '| Maintenance:', schedule.maintenance_name);
    console.log('📅 Due Date:', maintenanceDate.format('YYYY-MM-DD'));
    
    // Format due date for display
    const dueDateFormatted = maintenanceDate.format('YYYY-MM-DD');
    
    const ticketData = {
      locationCode: asset.location_code || asset.location,
      floor: asset.floor,
      subject: `For ${asset.equipment_name}, ${schedule.maintenance_name} to be done`,
      description: `This maintenance needs to be completed by ${dueDateFormatted}`,
      assetName: asset.equipment_name,
      assetId: asset.id,
      assetCategory: asset.category,
      assetSubCategory: asset.subcategory,
      maintenanceName: schedule.maintenance_name,
      scheduleId: schedule.id,
      dueDate: dueDateFormatted,
      maintenanceOwner: schedule.maintenance_owner
    };

    console.log('📤 Calling ExternalTicketing.createTicket with PPM data');
    
    // Use enhanced external ticketing utility
    const result = await ExternalTicketing.createTicket(
      ticketData,
      'PPM',
      schedule.id,
      triggerType
    );

    if (result.success) {
      console.log('✅ PPM External ticket created successfully:', result.ticketNumber);
    } else {
      console.log('❌ PPM External ticket creation failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('💥 Exception in createExternalTicket:', error);
    return { success: false, error: error.message };
  }
}







// Get maintenance schedules
router.get('/schedules', validate(paginationSchema, 'query'), async (req, res) => {
  try {
    const { asset_id, location, category, subcategory } = req.query;
    
    let sql = `
      SELECT 
        ms.*,
        a.equipment_name,
        a.location,
        a.category,
        a.subcategory
      FROM maintenance_schedules ms
      JOIN assets a ON ms.asset_id = a.id
      WHERE ms.is_active = 1
    `;
    
    const params = [];
    
    if (asset_id) {
      sql += ' AND ms.asset_id = ?';
      params.push(asset_id);
    }
    
    if (location) {
      sql += ' AND a.location = ?';
      params.push(location);
    }
    
    if (category) {
      sql += ' AND a.category = ?';
      params.push(category);
    }
    
    if (subcategory) {
      sql += ' AND a.subcategory = ?';
      params.push(subcategory);
    }
    
    sql += ' ORDER BY a.location, a.subcategory, a.category, ms.maintenance_name';
    
    const schedules = await db.all(sql, params);
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching maintenance schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create maintenance schedule
router.post('/schedules', validate(maintenanceScheduleSchema), async (req, res) => {
  try {
    const { asset_id, maintenance_name, start_date, frequency, frequency_value, owner } = req.body;
    
    console.log('Creating maintenance schedule with data:', {
      asset_id, maintenance_name, start_date, frequency, frequency_value, owner
    });
    
    // Validate required fields
    if (!asset_id || !maintenance_name || !start_date || !frequency) {
      return res.status(400).json({ 
        error: 'Missing required fields: asset_id, maintenance_name, start_date, frequency' 
      });
    }
    
    const scheduleId = uuidv4();
    
    // Insert the maintenance schedule with explicit is_active = 1
    await db.run(`
      INSERT INTO maintenance_schedules (id, asset_id, maintenance_name, start_date, frequency, frequency_value, owner, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [scheduleId, asset_id, maintenance_name, start_date, frequency, frequency_value || 1, owner || 'SW']);
    
    console.log(`Maintenance schedule created with ID: ${scheduleId}`);
    
    // Generate initial PPM tasks based on schedule (with error handling)
    try {
      const taskResult = await generatePPMTasks(scheduleId);
      console.log('PPM task generation result:', taskResult);
    } catch (taskError) {
      console.error('Error generating PPM tasks (non-fatal):', taskError);
      // Don't fail the entire request if task generation fails
    }
    
    res.status(201).json({ 
      id: scheduleId, 
      message: 'Maintenance schedule created successfully'
    });
  } catch (error) {
    console.error('Error creating maintenance schedule:', error);
    res.status(500).json({ 
      error: 'Failed to create maintenance schedule', 
      details: error.message 
    });
  }
});

// Update maintenance schedule
router.put('/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { maintenance_name, start_date, frequency, frequency_value, is_active, owner } = req.body;
    
    await db.run(`
      UPDATE maintenance_schedules 
      SET maintenance_name = ?, start_date = ?, frequency = ?, frequency_value = ?, is_active = ?, owner = ?
      WHERE id = ?
    `, [maintenance_name, start_date, frequency, frequency_value, is_active, owner || 'SW', id]);
    
    res.json({ message: 'Maintenance schedule updated successfully' });
  } catch (error) {
    console.error('Error updating maintenance schedule:', error);
    res.status(500).json({ error: error.message });
  }
});

// PPM Task Generation Removed - Now using external API only
// Maintenance schedules will only create external tickets, no internal task storage

// Helper function to calculate next maintenance date based on frequency
function calculateNextMaintenanceDate(startDate, frequency, frequencyValue = 1) {
  const start = moment(startDate);
  const today = moment().startOf('day');
  
  // If start date is in the future, return start date
  if (start.isAfter(today)) {
    return start;
  }
  
  let nextDate = start.clone();
  
  // Calculate next occurrence based on frequency
  switch (frequency.toLowerCase()) {
    case 'daily':
      // Find next daily occurrence
      while (nextDate.isBefore(today)) {
        nextDate.add(frequencyValue, 'days');
      }
      break;
      
    case 'weekly':
      // Find next weekly occurrence
      while (nextDate.isBefore(today)) {
        nextDate.add(frequencyValue, 'weeks');
      }
      break;
      
    case 'monthly':
      // Find next monthly occurrence
      while (nextDate.isBefore(today)) {
        nextDate.add(frequencyValue, 'months');
      }
      break;
      
    case 'quarterly':
      // Find next quarterly occurrence (3 months)
      while (nextDate.isBefore(today)) {
        nextDate.add(frequencyValue * 3, 'months');
      }
      break;
      
    case 'yearly':
    case 'annual':
      // Find next yearly occurrence
      while (nextDate.isBefore(today)) {
        nextDate.add(frequencyValue, 'years');
      }
      break;
      
    default:
      // Default to monthly if frequency is not recognized
      while (nextDate.isBefore(today)) {
        nextDate.add(frequencyValue, 'months');
      }
      break;
  }
  
  return nextDate;
}

// Generate PPM tasks for CRON mode - creates tickets for 15th day from today without duplicate checks
async function generatePPMTasksCron() {
  console.log('🤖 PPM Task Generation Started - CRON MODE');
  console.log('📋 Target: 15th day from today (no duplicate checks)');
  
  const today = moment().startOf('day');
  const targetDate = moment().add(15, 'days').startOf('day');
  
  console.log(`📅 Target Date: ${targetDate.format('YYYY-MM-DD')}`);
  
  let tasksCreated = 0;
  let tasksSkipped = 0;
  const results = [];
  
  try {
    // Get all active maintenance schedules with asset information
    const schedules = await db.all(`
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
    
    console.log(`📊 Found ${schedules.length} active maintenance schedules`);
    
    for (const schedule of schedules) {
      const scheduleStartDate = moment(schedule.start_date);
      const maintenanceDate = calculateNextMaintenanceDate(scheduleStartDate, schedule.frequency, schedule.frequency_value);
      
      console.log(`\n🔍 Processing: ${schedule.equipment_name} - ${schedule.maintenance_name}`);
      console.log(`📅 Next Due: ${maintenanceDate.format('YYYY-MM-DD')}`);
      console.log(`🎯 Target: ${targetDate.format('YYYY-MM-DD')}`);
      
      // Check if maintenance is due exactly on the 15th day from today
      if (maintenanceDate.isSame(targetDate, 'day')) {
        console.log(`✅ Creating PPM ticket for: ${schedule.equipment_name} - ${schedule.maintenance_name}`);
        
        // Create ticket in external system without duplicate checks (cron mode)
        const result = await createExternalTicket(
          {
            equipment_name: schedule.equipment_name,
            location: schedule.location,
            floor: schedule.floor,
            category: schedule.category,
            subcategory: schedule.subcategory,
            make: schedule.make,
            model_number: schedule.model_number
          },
          schedule,
          maintenanceDate,
          'CRON'
        );
        
        if (result.success) {
          tasksCreated++;
          console.log(`✅ PPM ticket created successfully: ${result.ticketNumber}`);
          results.push({
            scheduleId: schedule.schedule_id,
            equipmentName: schedule.equipment_name,
            maintenanceName: schedule.maintenance_name,
            ticketNumber: result.ticketNumber,
            status: 'created',
            dueDate: maintenanceDate.format('YYYY-MM-DD')
          });
        } else {
          tasksSkipped++;
          console.log(`❌ Failed to create PPM ticket: ${result.error}`);
          results.push({
            scheduleId: schedule.schedule_id,
            equipmentName: schedule.equipment_name,
            maintenanceName: schedule.maintenance_name,
            status: 'failed',
            reason: result.error,
            dueDate: maintenanceDate.format('YYYY-MM-DD')
          });
        }
      } else {
        console.log(`⏭️ Skipping - not due on target date`);
      }
    }
    
    console.log(`\n🎯 CRON PPM Task Generation Summary:`);
    console.log(`✅ Tasks Created: ${tasksCreated}`);
    console.log(`⏭️ Tasks Skipped: ${tasksSkipped}`);
    
    return {
      tasksCreated,
      tasksSkipped,
      results,
      mode: 'CRON'
    };
    
  } catch (error) {
    console.error('❌ Error in generatePPMTasksCron:', error);
    throw error;
  }
}

// Generate PPM tasks for MANUAL mode - checks existing tickets within 14-day window using bmsticketlist API
async function generatePPMTasksManual() {
  console.log('🔧 PPM Task Generation Started - MANUAL MODE');
  console.log('📋 Target: Next 14 days (with duplicate checks via bmsticketlist API)');
  
  const today = moment().startOf('day');
  const endDate = moment().add(14, 'days').endOf('day');
  
  console.log(`📅 Date Range: ${today.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
  
  let tasksCreated = 0;
  let tasksSkipped = 0;
  const results = [];
  
  try {
    // First, fetch existing tickets from bmsticketlist API to check for duplicates
    console.log('🔍 Fetching existing tickets from bmsticketlist API...');
    const existingTickets = new Set();
    
    try {
      const response = await fetch(`${EXTERNAL_API_CONFIG.baseURL}/v1/api/tickets/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': API_TOKEN
        },
        body: JSON.stringify({
          type: 'PPM',
          filters: {
            dateRange: {
              start: today.format('YYYY-MM-DD'),
              end: endDate.format('YYYY-MM-DD')
            }
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        (data.tickets || []).forEach(ticket => {
          const key = `${ticket.category}_${ticket.locationShortCode}_${moment(ticket.dueDate).format('YYYY-MM-DD')}`;
          existingTickets.add(key);
        });
        console.log(`🔑 Found ${existingTickets.size} existing tickets for deduplication`);
      } else {
        console.warn('⚠️ Could not fetch existing tickets, proceeding without duplicate checks');
      }
    } catch (apiError) {
      console.warn('⚠️ Error fetching existing tickets:', apiError.message);
      console.warn('⚠️ Proceeding without duplicate checks');
    }
    
    // Get all active maintenance schedules with asset information
    const schedules = await db.all(`
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
    
    console.log(`📊 Found ${schedules.length} active maintenance schedules`);
    
    for (const schedule of schedules) {
      const scheduleStartDate = moment(schedule.start_date);
      const maintenanceDate = calculateNextMaintenanceDate(scheduleStartDate, schedule.frequency, schedule.frequency_value);
      
      console.log(`\n🔍 Processing: ${schedule.equipment_name} - ${schedule.maintenance_name}`);
      console.log(`📅 Next Due: ${maintenanceDate.format('YYYY-MM-DD')}`);
      console.log(`🎯 Check Range: ${today.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
      
      // Check if maintenance is due within the next 14 days
      if (maintenanceDate.isSameOrAfter(today) && maintenanceDate.isSameOrBefore(endDate)) {
        // Check for duplicate tickets before creating
        const duplicateKey = `${schedule.maintenance_name}_${schedule.location}_${maintenanceDate.format('YYYY-MM-DD')}`;
        
        if (existingTickets.has(duplicateKey)) {
          console.log(`⏭️ Skipping - duplicate ticket already exists: ${duplicateKey}`);
          tasksSkipped++;
          results.push({
            scheduleId: schedule.schedule_id,
            equipmentName: schedule.equipment_name,
            maintenanceName: schedule.maintenance_name,
            status: 'skipped_duplicate',
            reason: 'Ticket already exists for this maintenance/location/date',
            dueDate: maintenanceDate.format('YYYY-MM-DD')
          });
          continue;
        }
        
        console.log(`✅ Creating PPM ticket for: ${schedule.equipment_name} - ${schedule.maintenance_name}`);
        
        // Create ticket in external system
        const result = await createExternalTicket(
          {
            equipment_name: schedule.equipment_name,
            location: schedule.location,
            floor: schedule.floor,
            category: schedule.category,
            subcategory: schedule.subcategory,
            make: schedule.make,
            model_number: schedule.model_number
          },
          schedule,
          maintenanceDate,
          'MANUAL'
        );
        
        if (result.success) {
          tasksCreated++;
          console.log(`✅ PPM ticket created successfully: ${result.ticketNumber}`);
          results.push({
            scheduleId: schedule.schedule_id,
            equipmentName: schedule.equipment_name,
            maintenanceName: schedule.maintenance_name,
            ticketNumber: result.ticketNumber,
            status: 'created',
            dueDate: maintenanceDate.format('YYYY-MM-DD')
          });
        } else {
          tasksSkipped++;
          console.log(`❌ Failed to create PPM ticket: ${result.error}`);
          results.push({
            scheduleId: schedule.schedule_id,
            equipmentName: schedule.equipment_name,
            maintenanceName: schedule.maintenance_name,
            status: 'failed',
            reason: result.error,
            dueDate: maintenanceDate.format('YYYY-MM-DD')
          });
        }
      } else {
        console.log(`⏭️ Skipping - not due within 14-day window`);
      }
    }
    
    console.log(`\n🎯 MANUAL PPM Task Generation Summary:`);
    console.log(`✅ Tasks Created: ${tasksCreated}`);
    console.log(`⏭️ Tasks Skipped: ${tasksSkipped}`);
    
    return {
      tasksCreated,
      tasksSkipped,
      results,
      mode: 'MANUAL'
    };
    
  } catch (error) {
    console.error('❌ Error in generatePPMTasksManual:', error);
    throw error;
  }
}

// Generate PPM tasks by creating tickets in external ticketing system (LEGACY - kept for compatibility)
async function generatePPMTasks(adminMode = false) {
  console.log('🎯 PPM Task Generation Started');
  console.log(`📋 Mode: 15-day window (unified logic)`);
  
  const today = moment().startOf('day');
  const endDate = moment().add(15, 'days').endOf('day');
  
  console.log(`📅 Date Range: ${today.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
  
  let tasksCreated = 0;
  let tasksSkipped = 0;
  const results = [];
  
  try {
    // First, fetch all existing PPM tickets to check for duplicates
    console.log('🔍 Fetching existing PPM tickets for deduplication...');
    const existingTicketsResult = await ExternalTicketing.fetchTickets('PPM', 'all', null, null, null, 1, 1000);
    
    const existingTickets = existingTicketsResult.success ? existingTicketsResult.data : [];
    console.log(`📊 Found ${existingTickets.length} existing PPM tickets`);
    
    // Create a set of existing ticket identifiers for quick lookup
    // Use combination of subject + location + due date to identify duplicates
    const existingTicketKeys = new Set();
    existingTickets.forEach(ticket => {
      if (ticket.subject && ticket.locationId?.locationShortCode) {
        // Create a unique key for each ticket to identify duplicates
        const key = `${ticket.subject}_${ticket.locationId.locationShortCode}_${moment(ticket.createdAt).format('YYYY-MM-DD')}`;
        existingTicketKeys.add(key);
      }
    });
    
    console.log(`🔑 Created ${existingTicketKeys.size} unique ticket keys for deduplication`);
    
    // Get all active maintenance schedules with asset information
    const schedules = await db.all(`
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
    
    console.log(`📊 Found ${schedules.length} active maintenance schedules`);
    
    for (const schedule of schedules) {
      const scheduleStartDate = moment(schedule.start_date);
      const maintenanceDate = calculateNextMaintenanceDate(scheduleStartDate, schedule.frequency, schedule.frequency_value);
      
      console.log(`\n🔍 Processing: ${schedule.equipment_name} - ${schedule.maintenance_name}`);
      console.log(`📅 Next Due: ${maintenanceDate.format('YYYY-MM-DD')}`);
      console.log(`🎯 Check Range: ${today.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
      
      // Check if maintenance is due within the specified date range
      if (maintenanceDate.isSameOrAfter(today) && maintenanceDate.isSameOrBefore(endDate)) {
        // Check for duplicate tickets before creating
        const duplicateKey = `${schedule.maintenance_name}_${schedule.location}_${maintenanceDate.format('YYYY-MM-DD')}`;
        
        if (existingTicketKeys.has(duplicateKey)) {
          console.log(`⏭️  Skipping - duplicate ticket already exists: ${duplicateKey}`);
          tasksSkipped++;
          results.push({
            scheduleId: schedule.schedule_id,
            equipmentName: schedule.equipment_name,
            maintenanceName: schedule.maintenance_name,
            status: 'skipped_duplicate',
            reason: 'Ticket already exists for this maintenance/location/date',
            dueDate: maintenanceDate.format('YYYY-MM-DD')
          });
          continue;
        }
        
        console.log(`✅ Creating PPM ticket for: ${schedule.equipment_name} - ${schedule.maintenance_name}`);
        
        // Prepare ticket data for external API
        const ticketData = {
          locationCode: schedule.location,
          category: "Lift", // Static category as per user specification
          subCategory: schedule.subcategory || schedule.frequency,
          ticketType: 'ppm',
          subject: schedule.maintenance_name, // Use maintenance name as subject per user specification
          description: `Preventive maintenance task for ${schedule.equipment_name}\n` +
                      `Maintenance Type: ${schedule.maintenance_name}\n` +
                      `Frequency: ${schedule.frequency}\n` +
                      `Location: ${schedule.location}\n` +
                      `Category: ${schedule.category}\n` +
                      `Make: ${schedule.make || 'N/A'}\n` +
                      `Model: ${schedule.model_number || 'N/A'}\n` +
                      `Due Date: ${maintenanceDate.format('YYYY-MM-DD')}\n` +
                      `Maintenance Owner: ${schedule.owner}`,
          floor: schedule.floor,
          maintenanceName: schedule.maintenance_name
        };
        
        // Create ticket in external system
        const result = await ExternalTicketing.createTicket(
          ticketData,
          'PPM',
          schedule.schedule_id,
          adminMode ? 'MANUAL' : 'CRON'
        );
        
        if (result.success) {
          tasksCreated++;
          console.log(`✅ PPM ticket created successfully: ${result.ticketNumber}`);
          results.push({
            scheduleId: schedule.schedule_id,
            equipmentName: schedule.equipment_name,
            maintenanceName: schedule.maintenance_name,
            ticketNumber: result.ticketNumber,
            status: 'created',
            dueDate: maintenanceDate.format('YYYY-MM-DD')
          });
        } else {
          tasksSkipped++;
          console.log(`❌ Failed to create PPM ticket: ${result.error}`);
          results.push({
            scheduleId: schedule.schedule_id,
            equipmentName: schedule.equipment_name,
            maintenanceName: schedule.maintenance_name,
            status: 'failed',
            error: result.error,
            dueDate: maintenanceDate.format('YYYY-MM-DD')
          });
        }
      } else {
        console.log(`⏭️  Skipping - not due in range`);
        tasksSkipped++;
      }
    }
    
    console.log(`\n🎯 PPM Task Generation Complete`);
    console.log(`✅ Tasks Created: ${tasksCreated}`);
    console.log(`⏭️  Tasks Skipped: ${tasksSkipped}`);
    
    return {
      message: 'PPM task generation completed',
      tasksCreated,
      tasksSkipped,
      results,
      mode: adminMode ? 'admin' : 'regular'
    };
    
  } catch (error) {
    console.error('❌ Error in PPM task generation:', error);
    throw error;
  }
}

router.get('/external-tasks', async (req, res) => {
  try {
    const { page = 1, limit = 10, location = '', category = '', status = '', view = '' } = req.query;
    
    console.log(`[External PPM Tasks] Request filters:`, { page, limit, location, category, status, view });
    
    // Use ExternalTicketing utility instead of hardcoded API calls
    const result = await ExternalTicketing.fetchTickets({
      type: 'PPM',
      page: parseInt(page),
      limit: parseInt(limit),
      location,
      category,
      status,
      view
    });
    
    if (!result.success) {
      console.error(`[External PPM Tasks] ExternalTicketing.fetchTickets failed:`, result.error);
      throw new Error(`External API error: ${result.error}`);
    }
    
    console.log(`[External PPM Tasks] ExternalTicketing result:`, JSON.stringify(result.response, null, 2));
    
    // Debug: Comprehensive API response analysis
    console.log(`[External PPM Tasks] Result data length:`, result.data.length);
    console.log(`[External PPM Tasks] Total count:`, result.totalCount);
    
    if (result.data.length > 0) {
      console.log(`[External PPM Tasks] First ticket structure:`, JSON.stringify(result.data[0], null, 2));
      console.log(`[External PPM Tasks] Available fields:`, Object.keys(result.data[0]));
    } else {
      console.log(`[External PPM Tasks] No tickets in result data`);
    }
    
    // Transform the external API response to match our frontend expectations
    const transformedTasks = result.data.map((ticket, index) => {
      // Exact 1-1 field mapping based on API response structure
      const transformed = {
        ticketNumber: ticket.ticketNumber,
        locationShortCode: ticket.locationId?.locationShortCode,
        category: ticket.subCategoryId?.category,
        status: ticket.status,
        subject: ticket.subject,
        description: ticket.description,
        pendingWith: ticket.currentAssignee?.assignedTo?.[0] || 'Unassigned',
        createdDate: ticket.createdAt,
        updatedDate: ticket.updatedAt
      };
      
      // Debug: Log transformation for first few tickets
      if (index < 3) {
        console.log(`[External PPM Tasks] Ticket ${index + 1} transformation:`);
        console.log(`  Original:`, {
          ticketNumber: ticket.ticketNumber,
          locationShortCode: ticket.locationShortCode,
          category: ticket.category,
          pendingWith: ticket.pendingWith
        });
        console.log(`  Transformed:`, {
          ticketNumber: transformed.ticketNumber,
          locationShortCode: transformed.locationShortCode,
          category: transformed.category,
          pendingWith: transformed.pendingWith
        });
      }
      
      return transformed;
    });
    
    res.json({
      tasks: transformedTasks,
      totalCount: result.totalCount || transformedTasks.length,
      currentPage: parseInt(page),
      totalPages: Math.ceil((result.totalCount || transformedTasks.length) / parseInt(limit))
    });
    
  } catch (error) {
    console.error('[External PPM Tasks] Error fetching external PPM tasks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch external PPM tasks',
      details: error.message,
      tasks: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1
    });
  }
});

// PPM KPI endpoint - Fetch KPI data from external API
router.get('/ppm-kpis', async (req, res) => {
  try {
    console.log(`[PPM KPIs] Fetching KPIs using ExternalTicketing utility`);
    
    // Use ExternalTicketing utility instead of hardcoded API calls
    const result = await ExternalTicketing.fetchKPIs('PPM');
    
    if (!result.success) {
      console.error(`[PPM KPIs] ExternalTicketing.fetchKPIs failed:`, result.error);
      throw new Error(`External KPI API error: ${result.error}`);
    }
    
    console.log(`[PPM KPIs] ExternalTicketing result:`, JSON.stringify(result.kpis, null, 2));
    
    const kpiResponse = {
      totalTickets: result.kpis.totalTickets || 0,
      openTickets: result.kpis.openTickets || 0,
      criticalTickets: result.kpis.criticalTickets || 0,
      pastDueTickets: result.kpis.pastDueTickets || 0,
      closedTickets: result.kpis.closedTickets || 0
    };
    
    console.log(`[PPM KPIs] Mapped KPI Response:`, JSON.stringify(kpiResponse, null, 2));
    
    // Return the KPI data
    res.json(kpiResponse);
    
  } catch (error) {
    console.error('[PPM KPIs] Error fetching KPI data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PPM KPI data',
      details: error.message,
      totalTickets: 0,
      openTickets: 0,
      criticalTickets: 0,
      pastDueTickets: 0,
      closedTickets: 0
    });
  }
});

// PPM Status Filter Options - Fetch from external API
router.get('/ppm-status-options', async (req, res) => {
  try {
    console.log('🔍 Fetching PPM status options from external API');
    const result = await ExternalTicketing.fetchStatusOptions('PPM');
    
    console.log('🔍 PPM Status Options Debug:');
    console.log('- Result success:', result.success);
    console.log('- Result data type:', typeof result.data);
    console.log('- Result data length:', Array.isArray(result.data) ? result.data.length : 'not array');
    console.log('- Raw result data:', JSON.stringify(result.data, null, 2));
    
    if (result.success) {
      // Transform the response to match frontend expectations
      const statusOptions = (result.data || []).map(status => ({
        value: status.value || status,
        label: status.label || status
      }));
      
      console.log('- Transformed status options:', JSON.stringify(statusOptions, null, 2));
      
      res.json({
        success: true,
        data: statusOptions
      });
    } else {
      console.log('- External API returned failure, sending empty array');
      res.json({
        success: true,
        data: []
      });
    }
  } catch (error) {
    console.error('❌ Error fetching PPM status options:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

// PPM Location Filter Options - Fetch from external API
router.get('/ppm-location-options', async (req, res) => {
  try {
    console.log('🔍 Fetching PPM location options from central service');
    const CentralLocationService = require('../utils/centralLocationService');
    const result = await CentralLocationService.fetchLocations();
    
    if (result.success) {
      console.log('✅ Raw location options received:', {
        count: result.data?.length || 0,
        sample: result.data?.slice(0, 2)
      });
      
      const locationOptions = CentralLocationService.transformLocationOptions(result.data);
      
      console.log('- Transformed location options (first 3):', JSON.stringify(locationOptions.slice(0, 3), null, 2));
      console.log('- Total transformed options:', locationOptions.length);
      
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
    console.error('💥 Exception in ppm-location-options endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Auto-generate PPM tasks endpoint for cron job - creates tickets for 15th day from today
router.post('/cron-generate-tasks', async (req, res) => {
  try {
    console.log('⏰ Scheduled PPM task generation triggered (15th day from today)');
    
    // Cron mode: Create tickets for exactly 15th day from today without duplicate checks
    const result = await generatePPMTasksCron();
    
    console.log(`✅ Scheduled PPM task generation completed: ${result.tasksCreated} created, ${result.tasksSkipped} skipped`);
    
    res.json({
      success: true,
      message: 'Scheduled PPM task generation completed successfully',
      tasksCreated: result.tasksCreated,
      tasksSkipped: result.tasksSkipped,
      totalTasksCreated: result.tasksCreated,
      totalTasksSkipped: result.tasksSkipped,
      schedulesProcessed: result.results.length,
      mode: 'CRON',
      results: result.results
    });

  } catch (error) {
    console.error('❌ Error in cron-generate-tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      tasksCreated: 0,
      tasksSkipped: 0,
      totalTasksSkipped: 0
    });
  }
});

// Auto-generate PPM tasks endpoint (for manual trigger) - checks existing tickets within 14-day window
router.post('/auto-generate-tasks', async (req, res) => {
  try {
    console.log('🔧 Manual PPM task generation triggered (14-day window with duplicate checks)');
    
    // Manual mode: Create tickets for next 14 days, checking existing tickets via bmsticketlist API
    const result = await generatePPMTasksManual();
    
    console.log(`✅ Manual PPM task generation completed: ${result.tasksCreated} created, ${result.tasksSkipped} skipped`);
    
    res.json({
      success: true,
      message: 'Manual PPM task generation completed successfully',
      tasksCreated: result.tasksCreated,
      tasksSkipped: result.tasksSkipped,
      totalTasksCreated: result.tasksCreated,
      totalTasksSkipped: result.tasksSkipped,
      schedulesProcessed: result.results.length,
      mode: 'MANUAL',
      results: result.results
    });

  } catch (error) {
    console.error('❌ Error in auto-generate-tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      tasksCreated: 0,
      tasksSkipped: 0,
      totalTasksCreated: 0,
      totalTasksSkipped: 0
    });
  }
});

module.exports = router;
