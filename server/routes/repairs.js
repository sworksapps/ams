const express = require('express');
const fetch = require('node-fetch');

const ExternalTicketing = require('../utils/externalTicketing');
const { EXTERNAL_API_CONFIG } = require('../utils/externalTicketing');

// Fallback token in case EXTERNAL_API_CONFIG is undefined
const API_TOKEN = EXTERNAL_API_CONFIG?.token || '3F4SWORKS5H6J7K8L9N0P1Q2R3S4T5V6W7X8Y9Z0';

// Debug log to check if config is loaded properly
console.log('🔧 [R&M] External API Config loaded:', {
  hasConfig: !!EXTERNAL_API_CONFIG,
  hasToken: !!(EXTERNAL_API_CONFIG?.token),
  tokenLength: EXTERNAL_API_CONFIG?.token?.length || 0
});

const router = express.Router();

/**
 * Get all R&M tickets from external API with filters
 */
router.get('/', async (req, res) => {
  try {
    const { 
      view = 'all',
      location, 
      status, 
      priority, 
      search,
      page = 1,
      limit = 50
    } = req.query;

    console.log('🎫 Fetching R&M tickets from external API with filters:', {
      view, location, status, priority, search, page, limit
    });

    // Prepare request payload for external API
    const requestPayload = {
      page: parseInt(page),
      limit: parseInt(limit),
      type: 'RM', // R&M ticket type
      filters: {}
    };

    // Add view filter
    if (view && view !== 'all') {
      requestPayload.filters.status = view;
    }

    // Add specific filters
    if (location) requestPayload.filters.location = location;
    if (status) requestPayload.filters.status = status;
    if (priority) requestPayload.filters.priority = priority;
    if (search) requestPayload.filters.search = search;

    console.log('📤 External API request payload:', JSON.stringify(requestPayload, null, 2));

    // Make API call to external ticketing system
    const response = await fetch(`${EXTERNAL_API_CONFIG.baseURL}/v1/api/tickets/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_TOKEN
      },
      body: JSON.stringify(requestPayload)
    });

    console.log('📥 External API response status:', response.status);

    if (!response.ok) {
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📥 External API response data:', JSON.stringify(data, null, 2));

    // Transform external API response to match frontend expectations
    const transformedTickets = (data.tickets || []).map(ticket => ({
      id: ticket.ticketNumber || ticket.id,
      ticketNumber: ticket.ticketNumber,
      locationShortCode: ticket.locationShortCode || ticket.location,
      category: ticket.category,
      subcategory: ticket.subcategory,
      status: ticket.status,
      priority: ticket.priority,
      pendingWith: ticket.pendingWith || 'N/A',
      createdAt: ticket.createdAt,
      dueDate: ticket.dueDate,
      description: ticket.description || ticket.subject,
      assignedTo: ticket.assignedTo
    }));

    res.json({
      success: true,
      data: transformedTickets,
      total: data.total || transformedTickets.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('❌ Error fetching R&M tickets from external API:', error);
    
    // Error logged via console output above

    res.status(500).json({
      success: false,
      error: error.message,
      data: [],
      total: 0
    });
  }
});

/**
 * Get R&M KPIs from external API
 */
router.get('/kpis', async (req, res) => {
  try {
    console.log('📊 Fetching R&M KPIs from external API');

    const result = await ExternalTicketing.fetchKPIs('RM');
    
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
    console.error('❌ Error fetching R&M KPIs:', error);
    
    // Log the error
    // Error logged via console output above

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
 * Get filter options for R&M tickets from external API
 */
router.get('/filter-options', async (req, res) => {
  try {
    console.log('🔍 Fetching R&M filter options from external API');

    // Make API call to get filter options
    const response = await fetch(`${EXTERNAL_API_CONFIG.baseURL}/v1/api/tickets/filters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_TOKEN
      },
      body: JSON.stringify({
        type: 'RM'
      })
    });

    console.log('📥 External API filter options response status:', response.status);

    if (!response.ok) {
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📥 External API filter options data:', JSON.stringify(data, null, 2));

    res.json({
      success: true,
      data: {
        locations: data.locations || [],
        statuses: data.statuses || [],
        priorities: data.priorities || [],
        categories: data.categories || []
      }
    });

  } catch (error) {
    console.error('❌ Error fetching R&M filter options:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      data: {
        locations: [],
        statuses: [],
        priorities: [],
        categories: []
      }
    });
  }
});

/**
 * Get status options for R&M tickets from external API
 */
router.get('/status-options', async (req, res) => {
  try {
    console.log('🔍 Fetching R&M status options from external API');
    const result = await ExternalTicketing.fetchStatusOptions('RM');
    
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
    console.error('❌ Error fetching R&M status options:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * Get location options for R&M tickets from external API
 */
router.get('/location-options', async (req, res) => {
  try {
    console.log('🔍 Fetching location options for repairs filter');
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
 * Get single R&M ticket by ID from external API
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🎫 Fetching R&M ticket ${id} from external API`);

    // Make API call to get specific ticket
    const response = await fetch(`${EXTERNAL_API_CONFIG.baseURL}/v1/api/tickets/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_TOKEN
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ 
          success: false,
          error: 'Ticket not found' 
        });
      }
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`🎫 External API ticket ${id} response:`, JSON.stringify(data, null, 2));

    // Transform to match frontend expectations
    const ticket = {
      id: data.ticketNumber || data.id,
      ticketNumber: data.ticketNumber,
      locationShortCode: data.locationShortCode || data.location,
      category: data.category,
      subcategory: data.subcategory,
      status: data.status,
      priority: data.priority,
      description: data.description || data.subject,
      createdAt: data.createdAt,
      dueDate: data.dueDate,
      assignedTo: data.assignedTo,
      pendingWith: data.pendingWith,
      attachments: data.attachments || []
    };

    res.json({
      success: true,
      data: ticket
    });

  } catch (error) {
    console.error(`❌ Error fetching R&M ticket ${req.params.id}:`, error);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create new R&M ticket via external API
 */
router.post('/', async (req, res) => {
  try {
    const ticketData = req.body;
    console.log('🎫 Creating R&M ticket via external API:', JSON.stringify(ticketData, null, 2));

    // Prepare payload for external API
    const requestPayload = {
      type: 'RM',
      category: ticketData.asset_category || ticketData.category,
      subcategory: ticketData.asset_subcategory || ticketData.subcategory,
      subject: ticketData.title || ticketData.subject,
      description: ticketData.description,
      location: ticketData.location,
      priority: ticketData.priority,
      assignedTo: ticketData.assigned_to || ticketData.assignedTo,
      vendor: ticketData.vendor,
      nature: ticketData.nature,
      chargeableTo: ticketData.chargeable_to,
      assetId: ticketData.asset_id
    };

    console.log('📤 External API create ticket payload:', JSON.stringify(requestPayload, null, 2));

    // Log the ticket creation attempt
    // Ticket creation logged via console output

    // Make API call to create ticket
    const response = await fetch(`${EXTERNAL_API_CONFIG.baseURL}/v1/api/ticket/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_TOKEN
      },
      body: JSON.stringify(requestPayload)
    });

    console.log('📥 External API create response status:', response.status);

    if (!response.ok) {
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📥 External API create response data:', JSON.stringify(data, null, 2));

    // Success logged via console output above

    res.status(201).json({
      success: true,
      data: {
        id: data.ticketNumber || data.id,
        ticketNumber: data.ticketNumber,
        message: 'R&M ticket created successfully'
      }
    });

  } catch (error) {
    console.error('❌ Error creating R&M ticket:', error);
    
    // Error logged via console output above

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// R&M tickets are now read-only from external API
// Updates should be done in the external ticketing system

// All R&M operations now use external ticketing API
// Dashboard summary and other operations should be handled via external API calls

module.exports = router;
