const axios = require('axios');
require('dotenv').config();

// Global service token storage
let globalServiceToken = {
  accessToken: null,
  expiry: 0
};

/**
 * Keycloak Authentication Utility
 * Handles token fetching and caching for external API authentication
 */
class KeycloakAuth {
  
  /**
   * Get Keycloak configuration from environment variables
   */
  static getConfig() {
    const config = {
      url: process.env.KEYCLOAK_URL,
      realm: process.env.KEYCLOAK_REALM,
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      timeout: parseInt(process.env.EXTERNAL_API_TIMEOUT) || 30000
    };

    // Validate required environment variables
    const requiredVars = ['url', 'realm', 'clientId', 'clientSecret'];
    const missingVars = requiredVars.filter(key => !config[key]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required Keycloak environment variables: ${missingVars.map(v => `KEYCLOAK_${v.toUpperCase()}`).join(', ')}`);
    }

    return config;
  }

  /**
   * Fetch access token from Keycloak with caching
   * @returns {Promise<string>} Access token
   */
  static async getAccessToken() {
    try {
      // Return cached token if still valid
      if (globalServiceToken.accessToken && globalServiceToken.expiry > Date.now()) {
        console.log('🔑 Using cached Keycloak token');
        return globalServiceToken.accessToken;
      }

      console.log('🔑 Fetching new Keycloak token...');
      const config = this.getConfig();
      
      const requestConfig = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `${config.url}/realms/${config.realm}/protocol/openid-connect/token`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'client_credentials',
        }),
        timeout: config.timeout
      };

      const result = await axios.request(requestConfig);
      const { access_token, expires_in } = result.data;
      
      // Cache the token with expiry buffer (subtract 60 seconds for safety)
      globalServiceToken = {
        accessToken: access_token,
        expiry: Date.now() + (expires_in - 60) * 1000,
      };
      
      console.log(`✅ Keycloak token fetched successfully, expires in ${expires_in} seconds`);
      return access_token;
    } catch (error) {
      console.error('❌ Keycloak authentication failed:', error.response?.data || error.message);
      throw new Error(`Keycloak authentication failed: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Clear cached token (useful for testing or forced refresh)
   */
  static clearToken() {
    globalServiceToken = {
      accessToken: null,
      expiry: 0
    };
    console.log('🗑️ Keycloak token cache cleared');
  }

  /**
   * Check if token is cached and valid
   * @returns {boolean} True if token is cached and valid
   */
  static isTokenValid() {
    return globalServiceToken.accessToken && globalServiceToken.expiry > Date.now();
  }

  /**
   * Get token expiry information
   * @returns {Object} Token expiry details
   */
  static getTokenInfo() {
    return {
      hasToken: !!globalServiceToken.accessToken,
      isValid: this.isTokenValid(),
      expiresAt: new Date(globalServiceToken.expiry),
      expiresIn: Math.max(0, Math.floor((globalServiceToken.expiry - Date.now()) / 1000))
    };
  }
}

module.exports = KeycloakAuth;
