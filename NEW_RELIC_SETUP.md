# New Relic Integration Setup Guide for AMS

## Overview
This guide explains how to complete the New Relic integration for your Asset Management System (AMS). New Relic has been integrated into both the backend (Node.js/Express) and frontend (React) applications.

## What's Already Configured

### Backend (Server)
- ✅ New Relic Node.js agent installed (`newrelic` package)
- ✅ Configuration file created (`server/newrelic.js`)
- ✅ Agent initialization added to `server/index.js`
- ✅ Custom transaction naming rules for API endpoints
- ✅ Error collection and distributed tracing enabled
- ✅ Application logging forwarding configured

### Frontend (Client)
- ✅ New Relic Browser agent installed (`@newrelic/browser-agent`)
- ✅ Browser agent configuration created (`client/src/utils/newrelic.js`)
- ✅ Agent initialization added to `client/src/index.js`
- ✅ Custom tracking functions for errors, events, API calls, and page views
- ✅ Session replay and user tracking configured

## Required Environment Variables

### Backend Environment Variables
Add these to your `.env.local`, `.env.uat`, and `.env.prod` files in the `server` directory:

```bash
# New Relic Configuration (Backend)
NEW_RELIC_LICENSE_KEY=your_license_key_here
NEW_RELIC_APP_NAME=AMS-Backend-Local  # Change for each environment
NEW_RELIC_LOG_LEVEL=info
NEW_RELIC_LOG_FILE=stdout
NEW_RELIC_TRACER_THRESHOLD=apdex_f
```

### Frontend Environment Variables
Add these to your `.env.local`, `.env.development`, and `.env.production` files in the `client` directory:

```bash
# New Relic Configuration (Frontend)
REACT_APP_NEW_RELIC_LICENSE_KEY=your_license_key_here
REACT_APP_NEW_RELIC_APPLICATION_ID=your_app_id_here
REACT_APP_NEW_RELIC_ACCOUNT_ID=your_account_id_here
REACT_APP_NEW_RELIC_TRUST_KEY=your_trust_key_here
REACT_APP_NEW_RELIC_BEACON=bam.nr-data.net
REACT_APP_NEW_RELIC_ERROR_BEACON=bam.nr-data.net
```

## Environment-Specific App Names

### Backend App Names
- **Local/Development**: `AMS-Backend-Local`
- **UAT**: `AMS-Backend-UAT`
- **Production**: `AMS-Backend-Production`

### Frontend App Names (configured in New Relic UI)
- **Local/Development**: `AMS-Frontend-Local`
- **UAT**: `AMS-Frontend-UAT`
- **Production**: `AMS-Frontend-Production`

## How to Get New Relic Credentials

1. **Sign up/Login** to New Relic at https://newrelic.com
2. **Create Applications**:
   - Go to "Add Data" → "Application monitoring"
   - Create separate applications for backend and frontend
   - Create separate apps for each environment (local, UAT, prod)

3. **Get License Key**:
   - Go to Account Settings → API Keys
   - Copy your License Key

4. **Get Application IDs**:
   - Go to your application → Settings → Application
   - Copy the Application ID

5. **Get Account ID and Trust Key**:
   - Account ID: Found in your account settings
   - Trust Key: Found in Browser application settings

## Features Included

### Backend Monitoring
- **APM Monitoring**: Full application performance monitoring
- **Error Tracking**: Automatic error collection and reporting
- **Database Monitoring**: PostgreSQL query performance
- **Custom Transactions**: API endpoints grouped logically
- **Distributed Tracing**: Request flow across services
- **Log Forwarding**: Application logs sent to New Relic

### Frontend Monitoring
- **Real User Monitoring (RUM)**: Actual user experience metrics
- **Error Tracking**: JavaScript errors and stack traces
- **Page Load Performance**: Core web vitals and timing
- **AJAX Monitoring**: API call performance from frontend
- **Session Replay**: Visual replay of user sessions (10% sampling)
- **Custom Events**: Track user interactions and business metrics

### Custom Tracking Functions (Frontend)
```javascript
import { trackError, trackCustomEvent, setUserContext, trackPageView, trackApiCall } from './utils/newrelic';

// Track errors
trackError(new Error('Something went wrong'), { context: 'user-action' });

// Track custom events
trackCustomEvent('user-interaction', 'button-click', { buttonName: 'save-asset' });

// Set user context
setUserContext('user123', 'user@example.com', { role: 'admin' });

// Track page views
trackPageView('Asset Management Dashboard');

// Track API calls
trackApiCall('/api/assets', 'GET', 150, 200);
```

## Integration with Existing CloudWatch Logging

New Relic complements your existing CloudWatch logging:
- **CloudWatch**: Detailed request/response logging for debugging
- **New Relic**: Performance metrics, error tracking, and user experience monitoring
- Both systems work together without conflicts

## Testing the Integration

### Backend Testing
1. Start your server with New Relic environment variables set
2. Look for "New Relic" initialization messages in console
3. Make API calls to generate traffic
4. Check New Relic APM dashboard for data

### Frontend Testing
1. Start your React app with New Relic environment variables set
2. Open browser dev tools and look for New Relic initialization
3. Navigate through the app to generate page views
4. Check New Relic Browser dashboard for data

## Troubleshooting

### Common Issues
1. **No data in New Relic**: Check license key and application ID
2. **Agent not starting**: Ensure environment variables are set correctly
3. **Frontend errors**: Check browser console for initialization errors
4. **Missing transactions**: Verify agent is loaded before other modules

### Debug Mode
Enable debug logging by setting:
```bash
NEW_RELIC_LOG_LEVEL=trace  # Backend
```

## Next Steps

1. **Get New Relic account and credentials**
2. **Add environment variables** to your `.env` files
3. **Restart both server and client** applications
4. **Verify data** appears in New Relic dashboards
5. **Set up alerts** for critical metrics
6. **Configure dashboards** for your team's needs

## Support

- New Relic Documentation: https://docs.newrelic.com/
- Node.js Agent: https://docs.newrelic.com/docs/apm/agents/nodejs-agent/
- Browser Agent: https://docs.newrelic.com/docs/browser/browser-monitoring/
