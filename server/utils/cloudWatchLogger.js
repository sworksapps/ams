const AWS = require('aws-sdk');

// Configure AWS CloudWatch Logs
const cloudWatchLogs = new AWS.CloudWatchLogs({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

class CloudWatchLogger {
  constructor() {
    this.logGroupName = process.env.AWS_LOG_GROUP_NAME || process.env.CLOUDWATCH_LOG_GROUP_NAME;
    
    // Determine environment-specific log stream name
    const environment = process.env.NODE_ENV || 'development';
    let streamPrefix = 'ams-uat'; // default for development
    
    if (environment === 'production' || process.env.ENV === 'prod') {
      streamPrefix = 'ams-prod';
    } else if (environment === 'uat' || process.env.ENV === 'uat') {
      streamPrefix = 'ams-uat';
    }
    
    this.logStreamName = `${streamPrefix}-${new Date().toISOString().split('T')[0]}-${process.pid}`;
    this.sequenceToken = null;
    this.initialized = false;
    
    if (!this.logGroupName) {
      console.warn('AWS_LOG_GROUP_NAME or CLOUDWATCH_LOG_GROUP_NAME not set in environment variables. CloudWatch logging disabled.');
      return;
    }
    
    this.initializeLogStream();
  }

  async initializeLogStream() {
    try {
      // Check if log group exists, create if it doesn't
      await this.ensureLogGroupExists();
      
      // Check if log stream exists, create if it doesn't
      await this.ensureLogStreamExists();
      
      this.initialized = true;
      console.log(`CloudWatch logging initialized: ${this.logGroupName}/${this.logStreamName}`);
    } catch (error) {
      console.error('Failed to initialize CloudWatch logging:', error.message);
    }
  }

  async ensureLogGroupExists() {
    try {
      await cloudWatchLogs.describeLogGroups({
        logGroupNamePrefix: this.logGroupName
      }).promise();
    } catch (error) {
      if (error.code === 'ResourceNotFoundException') {
        // Create log group if it doesn't exist
        await cloudWatchLogs.createLogGroup({
          logGroupName: this.logGroupName
        }).promise();
        console.log(`Created CloudWatch log group: ${this.logGroupName}`);
      } else {
        throw error;
      }
    }
  }

  async ensureLogStreamExists() {
    try {
      const response = await cloudWatchLogs.describeLogStreams({
        logGroupName: this.logGroupName,
        logStreamNamePrefix: this.logStreamName
      }).promise();

      if (response.logStreams.length > 0) {
        this.sequenceToken = response.logStreams[0].uploadSequenceToken;
      } else {
        // Create log stream if it doesn't exist
        await cloudWatchLogs.createLogStream({
          logGroupName: this.logGroupName,
          logStreamName: this.logStreamName
        }).promise();
        console.log(`Created CloudWatch log stream: ${this.logStreamName}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async logToCloudWatch(message, level = 'INFO') {
    if (!this.initialized || !this.logGroupName) {
      return;
    }

    try {
      const logEvent = {
        message: typeof message === 'string' ? message : JSON.stringify(message),
        timestamp: Date.now()
      };

      const params = {
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [logEvent]
      };

      if (this.sequenceToken) {
        params.sequenceToken = this.sequenceToken;
      }

      const response = await cloudWatchLogs.putLogEvents(params).promise();
      this.sequenceToken = response.nextSequenceToken;
    } catch (error) {
      console.error('Failed to log to CloudWatch:', error.message);
      
      // If sequence token is invalid, try to get the latest one
      if (error.code === 'InvalidSequenceTokenException') {
        try {
          await this.refreshSequenceToken();
          // Retry the log operation
          await this.logToCloudWatch(message, level);
        } catch (retryError) {
          console.error('Failed to retry CloudWatch logging:', retryError.message);
        }
      }
    }
  }

  async refreshSequenceToken() {
    try {
      const response = await cloudWatchLogs.describeLogStreams({
        logGroupName: this.logGroupName,
        logStreamNamePrefix: this.logStreamName
      }).promise();

      if (response.logStreams.length > 0) {
        this.sequenceToken = response.logStreams[0].uploadSequenceToken;
      }
    } catch (error) {
      console.error('Failed to refresh sequence token:', error.message);
    }
  }

  // Main function to log request and response data
  async logRequestResponse(req, res, responseData, responseTime) {
    if (!this.initialized || !this.logGroupName) {
      return;
    }

    // Sanitize sensitive data
    const sanitizedHeaders = { ...req.headers };
    if (sanitizedHeaders.authorization) {
      sanitizedHeaders.authorization = '[REDACTED]';
    }

    const logData = {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || req.headers['x-correlation-id'] || 'unknown',
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      headers: sanitizedHeaders,
      query: req.query,
      params: req.params,
      body: this.sanitizeRequestBody(req.body),
      response: {
        statusCode: res.statusCode,
        headers: res.getHeaders(),
        body: this.sanitizeResponseBody(responseData),
        responseTime: responseTime
      },
      user: {
        userId: req.user?.userId || req.headers['x-user-id'] || 'anonymous',
        email: req.user?.email || req.headers['x-user-email'] || 'unknown'
      }
    };

    const logMessage = `[${logData.method}] ${logData.url} - ${logData.response.statusCode} - ${logData.response.responseTime}ms - User: ${logData.user.userId}`;
    
    await this.logToCloudWatch({
      level: this.getLogLevel(res.statusCode),
      message: logMessage,
      details: logData
    });
  }

  sanitizeRequestBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    sensitiveFields.forEach(field => {
      Object.keys(sanitized).forEach(key => {
        if (key.toLowerCase().includes(field)) {
          sanitized[key] = '[REDACTED]';
        }
      });
    });
    
    return sanitized;
  }

  sanitizeResponseBody(body) {
    if (!body) return null;
    
    // For large responses, only log the structure
    const bodyStr = JSON.stringify(body);
    if (bodyStr.length > 10000) {
      return {
        _truncated: true,
        _originalSize: bodyStr.length,
        _structure: this.getObjectStructure(body)
      };
    }
    
    return body;
  }

  getObjectStructure(obj, maxDepth = 2, currentDepth = 0) {
    if (currentDepth >= maxDepth || obj === null || typeof obj !== 'object') {
      return typeof obj;
    }
    
    if (Array.isArray(obj)) {
      return `Array(${obj.length})`;
    }
    
    const structure = {};
    Object.keys(obj).forEach(key => {
      structure[key] = this.getObjectStructure(obj[key], maxDepth, currentDepth + 1);
    });
    
    return structure;
  }

  getLogLevel(statusCode) {
    if (statusCode >= 500) return 'ERROR';
    if (statusCode >= 400) return 'WARN';
    if (statusCode >= 300) return 'INFO';
    return 'INFO';
  }
}

// Create singleton instance
const cloudWatchLogger = new CloudWatchLogger();

module.exports = cloudWatchLogger;
