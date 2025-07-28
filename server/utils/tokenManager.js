const KeycloakAuth = require('./keycloakAuth');

/**
 * Centralized Token Manager
 * Provides a unified interface for all service-to-service authentication
 * Uses the existing KeycloakAuth utility for token management
 */
class TokenManager {
  
  /**
   * Get access token for service-to-service calls
   * This is the main method that all services should use
   * @returns {Promise<string>} Access token
   */
  static async getServiceToken() {
    try {
      console.log('🔑 TokenManager: Requesting service token...');
      const token = await KeycloakAuth.getAccessToken();
      console.log('✅ TokenManager: Service token obtained successfully');
      return token;
    } catch (error) {
      console.error('❌ TokenManager: Failed to get service token:', error.message);
      throw new Error(`Service authentication failed: ${error.message}`);
    }
  }

  /**
   * Get token with automatic retry logic
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<string>} Access token
   */
  static async getServiceTokenWithRetry(maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔑 TokenManager: Attempt ${attempt}/${maxRetries} to get service token`);
        return await this.getServiceToken();
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ TokenManager: Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ TokenManager: Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw new Error(`Service authentication failed after ${maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Clear cached tokens (useful for testing or forced refresh)
   */
  static clearTokenCache() {
    console.log('🗑️ TokenManager: Clearing token cache...');
    KeycloakAuth.clearToken();
  }

  /**
   * Get token information and status
   * @returns {Object} Token status information
   */
  static getTokenInfo() {
    const info = KeycloakAuth.getTokenInfo();
    console.log('ℹ️ TokenManager: Token info:', info);
    return info;
  }

  /**
   * Check if current token is valid
   * @returns {boolean} True if token is valid
   */
  static isTokenValid() {
    const isValid = KeycloakAuth.isTokenValid();
    console.log(`🔍 TokenManager: Token valid: ${isValid}`);
    return isValid;
  }

  /**
   * Prepare authorization headers for API calls
   * @returns {Promise<Object>} Headers object with authorization
   */
  static async getAuthHeaders() {
    try {
      const token = await this.getServiceToken();
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
    } catch (error) {
      console.error('❌ TokenManager: Failed to prepare auth headers:', error.message);
      throw error;
    }
  }

  // User information extraction is handled by auth middleware
  // TokenManager focuses only on service-to-service token management

  /**
   * Health check for token service
   * @returns {Promise<Object>} Health status
   */
  static async healthCheck() {
    try {
      const startTime = Date.now();
      const tokenInfo = this.getTokenInfo();
      
      if (tokenInfo.isValid) {
        return {
          status: 'healthy',
          message: 'Token service is working with cached token',
          tokenInfo,
          responseTime: Date.now() - startTime
        };
      }
      
      // Try to get a fresh token
      await this.getServiceToken();
      
      return {
        status: 'healthy',
        message: 'Token service is working with fresh token',
        tokenInfo: this.getTokenInfo(),
        responseTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Token service failed: ${error.message}`,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }
}

module.exports = TokenManager;
