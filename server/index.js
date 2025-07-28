// Load environment variables first, before any other modules
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const cron = require('node-cron');
const fetch = require('node-fetch');

// Import security and validation middleware
const { handleValidationError, sanitizeInput } = require('./middleware/validation');
const { upload, uploadMultiple, uploadSingle } = require('./utils/s3Upload');

const db = require('./database');
const { extractUserFromHeaders, optionalAuth, debugHeaders } = require('./middleware/auth');
const assetRoutes = require('./routes/assets');
const maintenanceRoutes = require('./routes/maintenance');
const coverageRoutes = require('./routes/coverage');
const repairRoutes = require('./routes/repairs');
const dashboardRoutes = require('./routes/dashboard');
const categoriesRoutes = require('./routes/categories');
const amcRenewalRoutes = require('./routes/amcRenewal');

const locationsRoutes = require('./routes/locations');

const app = express();
const PORT = process.env.PORT || 5001;

// Enhanced Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api-uat.sworks.co.in", "https://uat-sw-ticketing-api.sworks.co.in"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and local network access
    const allowedOrigins = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/192\.168\.\d+\.\d+:\d+$/,  // Local network 192.168.x.x
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,   // Local network 10.x.x.x
      /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/ // Local network 172.16-31.x.x
    ];
    
    const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
    callback(null, isAllowed);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));

// Input sanitization middleware (before parsing)
app.use(sanitizeInput);

// Body parsing with security limits
app.use(express.json({ 
  limit: '10mb', // Reduced from 50mb for security
  verify: (req, res, buf) => {
    // Verify JSON payload is not malicious
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new Error('Invalid JSON payload');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100 // Limit number of parameters
}));

// File upload configuration is now handled in utils/s3Upload.js
// This provides enhanced security, S3 integration, and better validation

// Static files
app.use('/uploads', express.static('uploads'));

// Debug middleware for development
if (process.env.NODE_ENV === 'development') {
  app.use('/api', debugHeaders);
}

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint to see what headers are being forwarded by the API Gateway/Lambda authorizer
app.get('/api/auth-test', (req, res) => {
  console.log('🔍 AUTH TEST - All Headers:', req.headers);
  
  // Extract potential user headers
  const userHeaders = {};
  Object.keys(req.headers).forEach(key => {
    if (key.startsWith('x-user-') || key.startsWith('x-auth-') || key === 'authorization') {
      userHeaders[key] = req.headers[key];
    }
  });
  
  res.json({
    message: 'Auth test endpoint',
    timestamp: new Date().toISOString(),
    allHeaders: req.headers,
    userHeaders: userHeaders,
    hasAuthHeader: !!req.headers.authorization,
    userAgent: req.headers['user-agent']
  });
});

// Apply authentication middleware to all API routes
// Frontend must send access token in all API calls
app.use('/api', extractUserFromHeaders);

// API Routes (all protected with user authentication)
app.use('/api/assets', assetRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/coverage', coverageRoutes);
app.use('/api/repairs', repairRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/amc-renewal', amcRenewalRoutes);
app.use('/api/asset-lifecycle', require('./routes/assetLifecycle'));

app.use('/api/locations', locationsRoutes);

// File upload endpoint with enhanced security
app.post('/api/upload', uploadMultiple('files', 5), (req, res) => {
  try {
    const files = req.files.map(file => ({
      id: uuidv4(),
      filename: file.filename || file.key, // S3 uses 'key' instead of 'filename'
      originalName: file.originalname,
      path: file.path || file.location, // S3 uses 'location' instead of 'path'
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: moment().toISOString()
    }));
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'File upload failed' 
    });
  }
});

// Validation error handling middleware (must be before generic error handler)
app.use(handleValidationError);

// Generic error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error.stack);
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({ 
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Daily PPM Task Generation Scheduler (runs at 4:00 AM every day)
cron.schedule('0 4 * * *', async () => {
  console.log('\n=== DAILY PPM TASK GENERATION STARTED ===');
  console.log(`Time: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
  
  try {
    // Make internal API call to auto-generate PPM tasks (regular mode - today only)
    const response = await fetch(`http://localhost:${PORT}/api/maintenance/cron-generate-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Daily PPM task generation completed successfully:');
      console.log(`- Tasks created: ${result.totalTasksCreated}`);
      console.log(`- Tasks skipped: ${result.totalTasksSkipped}`);
      console.log(`- Schedules processed: ${result.schedulesProcessed}`);
    } else {
      console.error('Daily PPM task generation failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error in daily PPM task generation:', error.message);
  }
  
  console.log('=== DAILY PPM TASK GENERATION COMPLETED ===\n');
}, {
  timezone: 'Asia/Kolkata' // Indian Standard Time
});

// Daily AMC Renewal Ticket Generation Scheduler (runs at 4:30 AM every day)
cron.schedule('30 4 * * *', async () => {
  console.log('\n=== DAILY AMC RENEWAL TICKET GENERATION STARTED ===');
  console.log(`Time: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
  
  try {
    // Make internal API call to auto-generate AMC renewal tickets
    const response = await fetch(`http://localhost:${PORT}/api/amc-renewal/auto-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Daily AMC renewal ticket generation completed successfully:');
      console.log(`- Tickets created: ${result.created}`);
      console.log(`- Tickets skipped: ${result.skipped}`);
      console.log(`- Tickets failed: ${result.failed}`);
      console.log(`- Execution time: ${result.executionTime}ms`);
    } else {
      console.error('Daily AMC renewal ticket generation failed:', response.statusText);
    }
  } catch (error) {
    console.error('Error in daily AMC renewal ticket generation:', error.message);
  }
  
  console.log('=== DAILY AMC RENEWAL TICKET GENERATION COMPLETED ===\n');
}, {
  timezone: 'Asia/Kolkata' // Indian Standard Time
});

// Initialize database and start server
db.init().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Asset Management Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Network access: http://[YOUR_IP]:${PORT}/api/health`);
    console.log('Daily PPM task scheduler initialized (runs at 4:00 AM IST)');
    console.log('Daily AMC Renewal scheduler initialized (runs at 4:30 AM IST)');
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
