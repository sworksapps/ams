// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_BASE_URL || 'http://localhost:5000',
  ENDPOINTS: {
    ASSETS: '/api/assets',
    MAINTENANCE: '/api/maintenance',
    REPAIRS: '/api/repairs',
    COVERAGE: '/api/coverage',
    DASHBOARD: '/api/dashboard'
  }
};

// Get the full API URL for an endpoint
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Get the base URL for asset photos and uploads
export const getAssetPhotoUrl = (photoPath) => {
  if (!photoPath || photoPath === 'undefined') return '';
  return `${API_CONFIG.BASE_URL}${photoPath}`;
};
