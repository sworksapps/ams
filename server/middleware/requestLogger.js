const cloudWatchLogger = require('../utils/cloudWatchLogger');

// Middleware to capture response data and log to CloudWatch
function requestResponseLogger(req, res, next) {
  const startTime = Date.now();
  
  // Store original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;
  
  let responseBody = null;
  let isResponseCaptured = false;

  // Override res.json to capture JSON responses
  res.json = function(data) {
    if (!isResponseCaptured) {
      responseBody = data;
      isResponseCaptured = true;
    }
    return originalJson.call(this, data);
  };

  // Override res.send to capture other responses
  res.send = function(data) {
    if (!isResponseCaptured) {
      responseBody = data;
      isResponseCaptured = true;
    }
    return originalSend.call(this, data);
  };

  // Override res.end to ensure we capture the response
  res.end = function(chunk, encoding) {
    if (!isResponseCaptured && chunk) {
      responseBody = chunk;
      isResponseCaptured = true;
    }
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    // Log to CloudWatch asynchronously (don't block the response)
    setImmediate(async () => {
      try {
        await cloudWatchLogger.logRequestResponse(req, res, responseBody, responseTime);
      } catch (error) {
        console.error('CloudWatch logging error:', error.message);
      }
    });
    
    return originalEnd.call(this, chunk, encoding);
  };

  next();
}

module.exports = requestResponseLogger;
