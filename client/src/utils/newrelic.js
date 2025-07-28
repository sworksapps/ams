import { BrowserAgent } from '@newrelic/browser-agent/loaders/browser-agent';

// New Relic Browser Agent Configuration for AMS Frontend
const options = {
  init: {
    distributed_tracing: { enabled: true },
    privacy: { cookies_enabled: true },
    ajax: { deny_list: ['bam.nr-data.net'] },
    session_trace: { enabled: true },
    session_replay: { 
      enabled: true,
      sampling_rate: 0.1, // 10% sampling rate
      error_sampling_rate: 1.0 // 100% for errors
    }
  },
  info: {
    beacon: process.env.REACT_APP_NEW_RELIC_BEACON || 'bam.nr-data.net',
    errorBeacon: process.env.REACT_APP_NEW_RELIC_ERROR_BEACON || 'bam.nr-data.net',
    licenseKey: process.env.REACT_APP_NEW_RELIC_LICENSE_KEY,
    applicationID: process.env.REACT_APP_NEW_RELIC_APPLICATION_ID,
    sa: 1
  },
  loader_config: {
    accountID: process.env.REACT_APP_NEW_RELIC_ACCOUNT_ID,
    trustKey: process.env.REACT_APP_NEW_RELIC_TRUST_KEY,
    agentID: process.env.REACT_APP_NEW_RELIC_APPLICATION_ID,
    licenseKey: process.env.REACT_APP_NEW_RELIC_LICENSE_KEY,
    applicationID: process.env.REACT_APP_NEW_RELIC_APPLICATION_ID
  }
};

// Initialize New Relic only if license key is provided
let newrelic = null;

if (process.env.REACT_APP_NEW_RELIC_LICENSE_KEY) {
  try {
    // Create and start the browser agent
    newrelic = new BrowserAgent(options);
    
    // Start the agent
    newrelic.start();
    
    console.log('New Relic Browser Agent initialized successfully');
  } catch (error) {
    console.warn('Failed to initialize New Relic Browser Agent:', error);
  }
} else {
  console.warn('New Relic Browser Agent not initialized - missing license key');
}

// Custom error tracking function
export const trackError = (error, customAttributes = {}) => {
  if (newrelic && window.newrelic) {
    window.newrelic.noticeError(error, customAttributes);
  } else {
    console.error('Error (New Relic not available):', error, customAttributes);
  }
};

// Custom event tracking function
export const trackCustomEvent = (eventType, eventName, attributes = {}) => {
  if (newrelic && window.newrelic) {
    window.newrelic.addPageAction(eventType, {
      eventName,
      ...attributes,
      timestamp: Date.now()
    });
  } else {
    console.log('Custom Event (New Relic not available):', { eventType, eventName, attributes });
  }
};

// User tracking function
export const setUserContext = (userId, userEmail, userAttributes = {}) => {
  if (newrelic && window.newrelic) {
    window.newrelic.setUserId(userId);
    window.newrelic.setCustomAttribute('user.email', userEmail);
    
    // Set additional user attributes
    Object.entries(userAttributes).forEach(([key, value]) => {
      window.newrelic.setCustomAttribute(`user.${key}`, value);
    });
  }
};

// Page view tracking function
export const trackPageView = (pageName, customAttributes = {}) => {
  if (newrelic && window.newrelic) {
    window.newrelic.addPageAction('pageView', {
      pageName,
      url: window.location.href,
      timestamp: Date.now(),
      ...customAttributes
    });
  }
};

// API call tracking function
export const trackApiCall = (endpoint, method, duration, status, error = null) => {
  if (newrelic && window.newrelic) {
    const attributes = {
      endpoint,
      method,
      duration,
      status,
      timestamp: Date.now()
    };
    
    if (error) {
      attributes.error = error.message || error.toString();
      window.newrelic.noticeError(error, attributes);
    } else {
      window.newrelic.addPageAction('apiCall', attributes);
    }
  }
};

export default newrelic;
