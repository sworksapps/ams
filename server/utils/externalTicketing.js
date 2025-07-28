const axios = require('axios');

const TokenManager = require('./tokenManager');
require('dotenv').config();

/**
 * Get external API configuration from environment variables
 */
const getExternalApiConfig = () => {
  const config = {
    baseURL: process.env.EXTERNAL_TICKETING_BASE_URL,
    locationBaseURL: process.env.EXTERNAL_LOCATION_BASE_URL,
    timeout: parseInt(process.env.EXTERNAL_API_TIMEOUT) || 30000
  };

  // Validate required environment variables
  if (!config.baseURL) {
    throw new Error('Missing required environment variable: EXTERNAL_TICKETING_BASE_URL');
  }
  if (!config.locationBaseURL) {
    throw new Error('Missing required environment variable: EXTERNAL_LOCATION_BASE_URL');
  }

  return config;
};

// User information will be extracted from request headers via TokenManager
// No longer using hardcoded default user info

/**
 * Get default company information from environment variables
 */
const getDefaultCompanyInfo = () => {
  return {
    companyId: process.env.DEFAULT_COMPANY_ID || "202",
    companyName: process.env.DEFAULT_COMPANY_NAME || "Smartworks Coworking Spaces Private Limited"
  };
};

// Export utilities for use in other modules
module.exports.getExternalApiConfig = getExternalApiConfig;
module.exports.getDefaultCompanyInfo = getDefaultCompanyInfo;

class ExternalTicketing {
  /**
   * Create external ticket with comprehensive logging
   * @param {Object} ticketData - Ticket creation data
   * @param {string} ticketData.locationCode - Location code from asset
   * @param {string} ticketData.floor - Floor from asset
   * @param {string} ticketData.subject - Ticket subject
   * @param {string} ticketData.description - Ticket description
   * @param {string} ticketData.assetName - Asset name
   * @param {string} ticketData.assetId - Asset ID
   * @param {string} ticketData.assetCategory - Asset category
   * @param {string} ticketData.assetSubCategory - Asset subcategory
   * @param {string} sourceType - 'PPM', 'AMC_RENEWAL', 'RM'
   * @param {string} sourceId - ID of the source record
   * @param {string} triggerType - 'CRON', 'MANUAL'
   * @param {Object} user - User object from auth middleware (req.user)
   */
  static async createTicket(ticketData, sourceType, sourceId, triggerType, user = null) {
    const startTime = Date.now();
    const config = getExternalApiConfig();
    
    // Format user info for external API
    const userInfo = user ? {
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: "end_user"
    } : {
      userId: "system",
      name: "System User",
      email: "system@sworks.co.in",
      phone: "919549731290",
      role: "end_user"
    };
    
    const defaultCompanyInfo = getDefaultCompanyInfo();
    const apiEndpoint = `${config.baseURL}/v1/api/ticket/v2`;
    
    let requestPayload;
    
    if (sourceType === 'PPM') {
      requestPayload = {
        locationCode: ticketData.locationCode,
        category: "Lift",
        subCategory: "Monthly",
        ticketType: "PPM",
        subject: ticketData.subject,
        description: ticketData.description,
        userInfo: userInfo,
        companyId: defaultCompanyInfo.companyId,
        companyName: defaultCompanyInfo.companyName,
        floor: ticketData.floor,
        channel: "BMS",
        channelInfo: {
          sdkversion: "v9"
        },
        formInfo: {
          maintenanceName: ticketData.maintenanceName,
          assetName: ticketData.assetName,
          dateOfService: ticketData.dueDate,
          assetId: ticketData.assetId,
          scheduleId: ticketData.scheduleId,
          dueDate: ticketData.dueDate,
          assetCategory: ticketData.assetCategory,
          assetSubCategory: ticketData.assetSubCategory,
          maintenanceOwner: ticketData.maintenanceOwner,
          vendorName: "Nikhil"
        }
      };
    } else if (sourceType === 'AMC_RENEWAL') {
      requestPayload = {
        locationCode: ticketData.locationCode,
        category: "AMC",
        subCategory: "Renewal",
        ticketType: "AMC",
        subject: ticketData.subject,
        description: "",
        userInfo: userInfo,
        companyId: defaultCompanyInfo.companyId,
        companyName: defaultCompanyInfo.companyName,
        floor: ticketData.floor,
        channel: "BMS",
        channelInfo: {
          sdkversion: "v9"
        },
        formInfo: {
          assetId: ticketData.assetId,
          assetName: ticketData.assetName,
          dueDate: ticketData.dueDate,
          assetCategory: ticketData.assetCategory,
          assetSubCategory: ticketData.assetSubCategory,
          coverageId: ticketData.coverageId
        }
      };
    } else {
      // Legacy format for other ticket types
      requestPayload = {
        locationCode: ticketData.locationCode || "GGN6",
        category: "Lift",
        subCategory: "Monthly",
        ticketType: "ppm",
        subject: ticketData.subject,
        description: ticketData.description,
        userInfo: userInfo,
        companyId: defaultCompanyInfo.companyId,
        companyName: defaultCompanyInfo.companyName,
        floor: ticketData.floor || "3",
        channel: "BMS",
        channelInfo: {
          sdkversion: "v9"
        },
        formInfo: {
          maintenanceName: ticketData.maintenanceName
        }
      };
    }

    console.log(`🎫 EXTERNAL TICKET CREATION START`);
    console.log(`📋 Source: ${sourceType} (ID: ${sourceId})`);
    console.log(`🔄 Trigger: ${triggerType}`);
    console.log(`🌐 Endpoint: ${apiEndpoint}`);
    console.log(`📤 Payload:`, JSON.stringify(requestPayload, null, 2));

    try {
      // Get service token via TokenManager
      const accessToken = await TokenManager.getServiceToken();
      
      const response = await axios.post(apiEndpoint, requestPayload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: config.timeout
      });

      const executionTime = Date.now() - startTime;
      const ticketNumber = response.data?.ticketNumber || response.data?.ticket_number || response.data?.id;

      console.log(`✅ EXTERNAL TICKET SUCCESS`);
      console.log(`🎟️ Ticket Number: ${ticketNumber}`);
      console.log(`📊 Status: ${response.status}`);
      console.log(`⏱️ Execution Time: ${executionTime}ms`);
      console.log(`📥 Response:`, JSON.stringify(response.data, null, 2));

      // Ticket creation logged via console output above

      return {
        success: true,
        ticketNumber,
        response: response.data,
        executionTime
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      const responseStatus = error.response?.status || 0;
      const responseData = error.response?.data || null;

      console.log(`❌ EXTERNAL TICKET FAILED`);
      console.log(`💥 Error: ${errorMessage}`);
      console.log(`📊 Status: ${responseStatus}`);
      console.log(`⏱️ Execution Time: ${executionTime}ms`);
      if (responseData) {
        console.log(`📥 Error Response:`, JSON.stringify(responseData, null, 2));
      }

      // Error details logged via console output above

      return {
        success: false,
        error: errorMessage,
        response: responseData,
        executionTime
      };
    }
  }

  /**
   * Fetch external tickets with filtering
   * @param {Object} filters - Filter parameters
   * @param {string} filters.type - Ticket type ('PPM', 'AMC', 'RM')
   * @param {string} filters.view - View filter ('open', 'closed', etc.)
   */
  static async fetchTickets(type = 'PPM', view = 'all', location = null, category = null, status = null, page = 1, limit = 10) {
    console.log(`🔍 FETCHING EXTERNAL TICKETS`);
    console.log(`📋 Filters:`, { type, view, location, category, status, page, limit });
    
    const config = getExternalApiConfig();
    
    // Map type to ticketType array format
    const ticketTypeMap = {
      'PPM': ['PPM'],
      'AMC': ['AMC'],
      'RM': ['R&M'],
      'R&M': ['R&M']
    };
    
    const ticketType = ticketTypeMap[type] || ['PPM'];
    
    // Build filter parameters for request body
    const filters = {};
    if (location) filters.location = location;
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (view && view !== 'all') filters.view = view;
    
    // API endpoint with only page and limit as query params
    const baseUrl = `${config.baseURL}/v1/api/ticket/bmsticketlistv2`;
    const apiUrl = `${baseUrl}?page=${page}&limit=${limit}`;
    
    // Request body with ticketType as array and filters
    const requestBody = {
      ticketType: ticketType,
      ...filters
    };

    console.log(`🔗 POST URL: ${apiUrl}`);
    console.log(`📤 Request Body:`, JSON.stringify(requestBody, null, 2));

    try {
      // Get service token via TokenManager
      const accessToken = await TokenManager.getServiceToken();
      
      // Use POST method with correct format
      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: config.timeout
      });
      
      console.log(`✅ FETCH TICKETS SUCCESS`);
      console.log(`📊 Status: ${response.status}`);
      console.log(`📦 Data Count: ${response.data?.data?.length || 0}`);

      return {
        success: true,
        data: response.data?.data || [],
        totalCount: response.data?.totalCount || 0,
        response: response.data
      };

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      
      console.log(`❌ FETCH TICKETS FAILED`);
      console.log(`💥 Error: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        data: [],
        totalCount: 0
      };
    }
  }

  /**
   * Fetch status options from external system
   * @param {string} type - Ticket type ('PPM', 'AMC', 'RM')
   */
  static async fetchStatusOptions(type = 'PPM') {
    const config = getExternalApiConfig();
    const apiEndpoint = `${config.baseURL}/v1/api/common/statusList?type=${type}`;

    console.log(`🔍 FETCHING STATUS OPTIONS`);
    console.log(`🌐 Endpoint: ${apiEndpoint}`);

    try {
      // Get service token via TokenManager
      const accessToken = await TokenManager.getServiceToken();
      
      const response = await axios.get(apiEndpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: config.timeout
      });

      console.log(`✅ FETCH STATUS OPTIONS SUCCESS`);
      console.log(`📊 Status: ${response.status}`);
      console.log(`📦 Data:`, JSON.stringify(response.data, null, 2));

      return {
        success: true,
        data: response.data?.data || response.data || [],
        response: response.data
      };

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      
      console.log(`❌ FETCH STATUS OPTIONS FAILED`);
      console.log(`💥 Error: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        data: []
      };
    }
  }

  /**
   * Fetch location options from external system
   */
  static async fetchLocationOptions() {
    const config = getExternalApiConfig();
    // Location API uses different base URL
    const apiEndpoint = `${config.locationBaseURL}/location`;

    console.log(`🔍 FETCHING LOCATION OPTIONS`);
    console.log(`🌐 Endpoint: ${apiEndpoint}`);

    try {
      // Get service token via TokenManager
      const accessToken = await TokenManager.getServiceToken();
      
      const response = await axios.get(apiEndpoint, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: config.timeout
      });

      console.log(`✅ FETCH LOCATION OPTIONS SUCCESS`);
      console.log(`📊 Status: ${response.status}`);
      console.log(`📦 Data:`, JSON.stringify(response.data, null, 2));

      return {
        success: true,
        data: response.data?.data || response.data || [],
        response: response.data
      };

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      
      console.log(`❌ FETCH LOCATION OPTIONS FAILED`);
      console.log(`💥 Error: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        data: []
      };
    }
  }

  /**
   * Fetch filter options from external system
   * @param {string} type - Ticket type ('PPM', 'AMC', 'RM')
   */
  static async fetchFilterOptions(type = 'PPM') {
    const statusOptions = await ExternalTicketing.fetchStatusOptions(type);
    const locationOptions = await ExternalTicketing.fetchLocationOptions();

    return {
      success: statusOptions.success && locationOptions.success,
      data: {
        statuses: statusOptions.data,
        locations: locationOptions.data,
        priorities: [],
        categories: []
      }
    };
  }

  /**
   * Fetch KPIs from external system
   * @param {string} type - Ticket type ('PPM', 'AMC', 'RM')
   */
  static async fetchKPIs(type = 'PPM') {
    const config = getExternalApiConfig();
    const apiEndpoint = `${config.baseURL}/v1/api/ticket/bmskpicountv2`;
    
    const requestPayload = {
      ticketType: type
    };

    console.log(`📊 FETCHING KPIs`);
    console.log(`🌐 Endpoint: ${apiEndpoint}`);
    console.log(`📤 Payload:`, JSON.stringify(requestPayload, null, 2));

    try {
      // Get service token via TokenManager
      const accessToken = await TokenManager.getServiceToken();
      
      const response = await axios.post(apiEndpoint, requestPayload, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: config.timeout
      });

      console.log(`✅ FETCH KPIs SUCCESS`);
      console.log(`📊 Status: ${response.status}`);
      console.log(`📦 Data:`, JSON.stringify(response.data, null, 2));

      return {
        success: true,
        kpis: {
          totalTickets: response.data?.totalTickets || 0,
          openTickets: response.data?.openTickets || 0,
          criticalTickets: response.data?.criticalTickets || 0,
          pastDueTickets: response.data?.pastDueTickets || 0,
          closedTickets: response.data?.closedTickets || 0
        }
      };

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.log(`❌ FETCH KPIs FAILED for ${type}:`, errorMessage);
      
      return {
        success: false,
        kpis: {
          totalTickets: 0,
          openTickets: 0,
          criticalTickets: 0,
          pastDueTickets: 0,
          closedTickets: 0
        }
      };
    }
  }
}

module.exports = ExternalTicketing;
