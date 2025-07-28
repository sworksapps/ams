import Keycloak from 'keycloak-js';

// Keycloak configuration
const keycloakConfig = {
  url: process.env.REACT_APP_KEYCLOAK_URL || 'https://auth-uat.sworks.co.in',
  realm: process.env.REACT_APP_KEYCLOAK_REALM || 'pre-prod',
  clientId: process.env.REACT_APP_KEYCLOAK_CLIENT_ID || 'ams-frontend'
};

// Global singleton to prevent double initialization across React re-renders
if (!window.keycloakInstance) {
  window.keycloakInstance = new Keycloak(keycloakConfig);
  console.log('🔐 Keycloak instance created and stored globally');
}

// Use the global instance
const keycloak = window.keycloakInstance;

// Keycloak initialization options
export const keycloakInitOptions = {
  onLoad: 'login-required', // Automatically redirect to login if not authenticated
  redirectUri: window.location.origin + '/',
  postLogoutRedirectUri: window.location.origin + '/',
  checkLoginIframe: false,
  checkLoginIframeInterval: 5,
  enableLogging: process.env.NODE_ENV === 'development',
  // Add additional options for better debugging
  messageReceiveTimeout: 10000,
  silentCheckSsoFallback: false
};

// Helper function to safely initialize Keycloak
export const initializeKeycloak = () => {
  if (keycloak.didInitialize) {
    console.log('🔐 Keycloak already initialized, skipping...');
    return Promise.resolve(keycloak.authenticated);
  }
  
  console.log('🔐 Initializing Keycloak...');
  return keycloak.init(keycloakInitOptions);
};

// Token refresh configuration
export const keycloakTokenRefreshOptions = {
  minValidity: 30, // Refresh token if it expires in less than 30 seconds
  checkLoginIframe: false
};

export default keycloak;
