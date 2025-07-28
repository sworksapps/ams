const fetch = require('node-fetch');
const TokenManager = require('./tokenManager');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Central Location Service API utility
 * Handles integration with the central service for locations and floors
 */
class CentralLocationService {
  constructor() {
    // Use new API base URL
    this.baseURL = 'https://api-uat.sworks.co.in/core/properties';
    this.isConfigured = true;
    
    console.log('🏢 Central Location Service initialized with new API:', this.baseURL);
  }

  /**
   * Check if the service is properly configured
   * @returns {boolean} True if configured
   */
  isAvailable() {
    // Service is always available with the new centralized API
    return true;
  }

  /**
   * Get Keycloak bearer token using centralized token manager
   * @returns {Promise<string>} Bearer token
   */
  async getBearerToken() {
    if (!this.isAvailable()) {
      throw new Error('Central location service not configured');
    }
    
    try {
      return await TokenManager.getServiceToken();
    } catch (error) {
      console.error('❌ Failed to get service token for Central Location Service:', error.message);
      throw error;
    }
  }

  /**
   * Fetch all locations from central service
   * @returns {Promise<Object>} API response with locations
   */
  async fetchLocations() {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Central location service not configured',
        data: []
      };
    }
    
    const startTime = Date.now();
    const token = await this.getBearerToken();
    const url = `${this.baseURL}/all`;

    try {
      console.log('🏢 Fetching locations from central service:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const responseTime = Date.now() - startTime;
      console.log(`🏢 Location API Response: ${response.status} (${responseTime}ms)`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Location API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data: []
        };
      }

      const responseData = await response.json();
      
      // Extract locations array from response.data
      const locations = responseData.data || responseData || [];
      
      console.log('✅ Locations fetched successfully:', {
        count: Array.isArray(locations) ? locations.length : 'unknown',
        responseTime: `${responseTime}ms`
      });

      return {
        success: true,
        data: locations,
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('💥 Exception fetching locations:', {
        error: error.message,
        responseTime: `${responseTime}ms`,
        url
      });

      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Fetch floors for a specific center/location
   * @param {string} centerId - The center ID to fetch floors for
   * @returns {Promise<Object>} API response with floors
   */
  async fetchFloors(centerId) {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Central location service not configured',
        data: []
      };
    }
    
    if (!centerId) {
      return {
        success: false,
        error: 'Center ID is required',
        data: []
      };
    }

    const startTime = Date.now();
    const token = await this.getBearerToken();
    const url = `${this.baseURL}/${centerId}?includes=floors`;

    try {
      console.log('🏢 Fetching floors from central service:', { centerId, url });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const responseTime = Date.now() - startTime;
      console.log(`🏢 Floor API Response: ${response.status} (${responseTime}ms)`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Floor API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          centerId
        });
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          data: []
        };
      }

      const data = await response.json();
      console.log('✅ Floors fetched successfully:', {
        centerId,
        count: Array.isArray(data) ? data.length : 'unknown',
        responseTime: `${responseTime}ms`
      });

      return {
        success: true,
        data: data || [],
        responseTime
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('💥 Exception fetching floors:', {
        error: error.message,
        centerId,
        responseTime: `${responseTime}ms`,
        url
      });

      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Transform location data for frontend consumption
   * @param {Array} locations - Raw location data from API
   * @returns {Array} Transformed location options
   */
  transformLocationOptions(locations) {
    if (!Array.isArray(locations)) {
      return [];
    }

    return locations.map(location => ({
      value: location.code, // Use code as the primary value
      label: location.name, // Use name as display name everywhere
      name: location.name,
      alternateId: location.code, // Code is the most important - use as alternateId
      centerId: location.id, // Use id as centerId
      locationShortCode: location.code // For backward compatibility
    }));
  }

  /**
   * Transform floor data for frontend consumption
   * @param {Object|Array} data - Raw response data from API (could be object with floors property or direct array)
   * @returns {Array} Transformed floor options
   */
  transformFloorOptions(data) {
    // Handle case where data is an object with floors property
    let floors = data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      floors = data.floors || [];
    }
    
    if (!Array.isArray(floors)) {
      return [];
    }

    return floors.map(floor => ({
      value: floor.code || floor.id, // Use code as primary value
      label: floor.name || floor.floorName, // Use name as display
      name: floor.name,
      alternateId: floor.code || floor.alternateId || floor.alternateID,
      floorId: floor.id,
      code: floor.code
    }));
  }
}

module.exports = new CentralLocationService();
