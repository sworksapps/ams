import axios from 'axios';

// API Configuration Constants
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  TIMEOUT: 10000,
  TOKEN_REFRESH_THRESHOLD: 30, // seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // milliseconds
};

// HTTP Status Codes
const HTTP_STATUS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error Messages
const ERROR_MESSAGES = {
  AUTHENTICATION_FAILED: 'Authentication failed',
  TOKEN_REFRESH_FAILED: 'Token refresh failed',
  UNAUTHORIZED_ACCESS: '🔐 Unauthorized access, redirecting to login',
  ACCESS_FORBIDDEN: '🚫 Access forbidden - insufficient permissions',
  RESOURCE_NOT_FOUND: '🔍 Resource not found',
  SERVER_ERROR: '🔥 Server error - please try again later',
  SERVICE_UNAVAILABLE: '⚠️ Service temporarily unavailable'
};

// Global reference to keycloak instance (will be set by AuthProvider)
let keycloakInstance = null;

// Function to set keycloak instance
export const setKeycloakInstance = (keycloak) => {
  keycloakInstance = keycloak;
};

// Enhanced utility functions
const logApiRequest = (config, token) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 API Request:', {
      url: config.url,
      method: config.method?.toUpperCase(),
      hasToken: !!token,
      authenticated: keycloakInstance?.authenticated || false,
      timestamp: new Date().toISOString()
    });
  }
};

const logApiResponse = (response) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ API Response:', {
      url: response.config.url,
      status: response.status,
      duration: response.config.metadata?.endTime - response.config.metadata?.startTime || 0
    });
  }
};

const logApiError = (error) => {
  console.error('❌ API Error:', {
    url: error.config?.url,
    method: error.config?.method?.toUpperCase(),
    status: error.response?.status,
    statusText: error.response?.statusText,
    message: error.message,
    timestamp: new Date().toISOString()
  });
};

// Enhanced error handler with retry logic
const handleApiError = (error) => {
  const status = error.response?.status;
  
  switch (status) {
    case HTTP_STATUS.UNAUTHORIZED:
      console.log(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      if (keycloakInstance?.login) {
        keycloakInstance.login();
      } else {
        window.location.href = '/login';
      }
      break;
    case HTTP_STATUS.FORBIDDEN:
      console.warn(ERROR_MESSAGES.ACCESS_FORBIDDEN);
      break;
    case HTTP_STATUS.NOT_FOUND:
      console.warn(ERROR_MESSAGES.RESOURCE_NOT_FOUND);
      break;
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      console.error(ERROR_MESSAGES.SERVER_ERROR);
      break;
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      console.warn(ERROR_MESSAGES.SERVICE_UNAVAILABLE);
      break;
    default:
      break;
  }
  
  return Promise.reject(error);
};

// Create axios instance with optimized configuration
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  // Add request timing metadata
  transformRequest: [(data, headers) => {
    return data;
  }],
});

// Enhanced request interceptor with timing and authentication
api.interceptors.request.use(
  async (config) => {
    // Add request timing metadata
    config.metadata = { startTime: Date.now() };
    
    // Add Keycloak auth token if available
    if (keycloakInstance?.authenticated) {
      try {
        // Ensure token is fresh (refresh if needed)
        await keycloakInstance.updateToken(API_CONFIG.TOKEN_REFRESH_THRESHOLD);
        const token = keycloakInstance.token;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          logApiRequest(config, token);
        }
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        // Token refresh failed, redirect to login
        if (keycloakInstance.login) {
          keycloakInstance.login();
        }
        return Promise.reject(new Error(ERROR_MESSAGES.AUTHENTICATION_FAILED));
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ API Request without authentication:', config.url);
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Enhanced response interceptor with timing and error handling
api.interceptors.response.use(
  (response) => {
    // Add response timing metadata
    if (response.config.metadata) {
      response.config.metadata.endTime = Date.now();
    }
    
    logApiResponse(response);
    return response;
  },
  (error) => {
    // Add error timing metadata
    if (error.config?.metadata) {
      error.config.metadata.endTime = Date.now();
    }
    
    logApiError(error);
    return handleApiError(error);
  }
);

// API Endpoints - Organized by domain

// Dashboard API
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard'),
  getAssetDashboard: () => api.get('/dashboard/assets'),
  getLocationSummary: () => api.get('/dashboard/location-summary'),
  getRepairsSummary: () => api.get('/dashboard/repairs-summary'),
  getPPMSummary: () => api.get('/dashboard/ppm-summary'),
  getAMCSummary: () => api.get('/dashboard/amc-summary'),
  getKPIs: (ticketType) => api.post('/dashboard/kpis', { ticketType }),
};

// Locations API (Central Service)
export const locationsAPI = {
  getAll: () => api.get('/locations'),
  getFloors: (centerId) => api.get(`/locations/${centerId}/floors`),
};

// Assets API
export const assetsAPI = {
  // CRUD operations
  getAll: (params = {}) => api.get('/assets', { params }),
  getById: (id) => api.get(`/assets/${id}`),
  create: (data) => api.post('/assets', data),
  update: (id, data) => api.put(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
  
  // Data endpoints
  getLocations: () => api.get('/assets/data/locations'),
  getCategories: () => api.get('/assets/data/categories'),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getSubcategories: (categoryId) => api.get(`/categories/${categoryId}/subcategories`),
  getSubcategoriesByName: (categoryName) => api.get(`/categories/by-name/${categoryName}/subcategories`),
  getHierarchical: () => api.get('/categories/hierarchical'),
};

// Maintenance API
export const maintenanceAPI = {
  // Dashboard and schedules
  getDashboard: () => api.get('/maintenance/dashboard'),
  getSchedules: (params = {}) => api.get('/maintenance/schedules', { params }),
  createSchedule: (data) => api.post('/maintenance/schedules', data),
  updateSchedule: (id, data) => api.put(`/maintenance/schedules/${id}`, data),
  
  // PPM Tasks (External API integration)
  getTasks: (params = {}) => api.get('/maintenance/external-tasks', { params }),
  getKPIs: () => api.get('/maintenance/ppm-kpis'),
  getStatusOptions: () => api.get('/maintenance/ppm-status-options'),
  getLocationOptions: () => api.get('/maintenance/ppm-location-options'),
  generatePPMTasksAdminMode: () => api.post('/maintenance/auto-generate-tasks'),
};

// Coverage API
export const coverageAPI = {
  // CRUD operations
  getAll: (params = {}) => api.get('/coverage', { params }),
  getByAsset: (assetId) => api.get(`/coverage/asset/${assetId}`),
  create: (data) => api.post('/coverage', data),
  update: (id, data) => api.put(`/coverage/${id}`, data),
  
  // Specialized operations
  renew: (id, data) => api.post(`/coverage/${id}/renew`, data),
  getExpiring: (params = {}) => api.get('/coverage/expiring', { params }),
  getSummary: () => api.get('/coverage/summary'),
};

// Repairs API
export const repairsAPI = {
  // CRUD operations
  getAll: (params = {}) => api.get('/repairs', { params }),
  getById: (id) => api.get(`/repairs/${id}`),
  create: (data) => api.post('/repairs', data),
  update: (id, data) => api.put(`/repairs/${id}`, data),
  
  // Workflow operations
  assign: (id, data) => api.post(`/repairs/${id}/assign`, data),
  close: (id, data) => api.post(`/repairs/${id}/close`, data),
  
  // Data and analytics
  getKPIs: () => api.get('/repairs/kpis'),
  getFilterOptions: () => api.get('/repairs/filter-options'),
  getSummary: () => api.get('/repairs/summary/dashboard'),
  
  // External API integration (R&M)
  getRMStatusOptions: () => api.get('/repairs/status-options'),
  getRMLocationOptions: () => api.get('/repairs/location-options'),
};

// Keep ticketsAPI as alias for backward compatibility
export const ticketsAPI = repairsAPI;

// AMC Renewal API
export const amcRenewalAPI = {
  // External tickets integration
  getExternalTickets: async (params = {}) => {
    const response = await api.get('/amc-renewal/external-tickets', { params });
    return response.data;
  },
  
  // Analytics and filters
  getKPIs: async () => {
    const response = await api.get('/amc-renewal/kpis');
    return response.data;
  },
  getStatusOptions: async () => {
    const response = await api.get('/amc-renewal/status-options');
    return response.data;
  },
  getLocationOptions: async () => {
    const response = await api.get('/amc-renewal/location-options');
    return response.data;
  },
  
  // Operations
  createTicket: async (data) => {
    const response = await api.post('/amc-renewal/create-ticket', data);
    return response.data;
  },
  autoGenerate: async () => {
    const response = await api.post('/amc-renewal/auto-generate');
    return response.data;
  },
};

// Asset Lifecycle API - Asset-Centric Management System
export const assetLifecycleAPI = {
  getAssetLifecycle: (assetId) => api.get(`/asset-lifecycle/asset/${assetId}/lifecycle`),
  getLifecycleSummary: () => api.get('/asset-lifecycle/summary'),
  getAssetCentricDashboard: () => api.get('/asset-lifecycle/dashboard'),
};

// File upload API
export const uploadAPI = {
  uploadFiles: (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
