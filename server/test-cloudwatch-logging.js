const express = require('express');
const cloudWatchLogger = require('./utils/cloudWatchLogger');

// Simple test to verify CloudWatch logging functionality
async function testCloudWatchLogging() {
  console.log('Testing CloudWatch logging functionality...');
  
  try {
    // Test basic logging
    await cloudWatchLogger.logToCloudWatch('Test message from AMS server', 'INFO');
    console.log('✅ Basic CloudWatch logging test passed');
    
    // Test request/response logging with mock data
    const mockReq = {
      method: 'GET',
      originalUrl: '/api/test',
      headers: {
        'user-agent': 'test-agent',
        'x-user-id': 'test-user-123'
      },
      query: { test: 'query' },
      params: { id: '123' },
      body: { test: 'data' },
      ip: '127.0.0.1',
      user: { userId: 'test-user-123', email: 'test@example.com' }
    };
    
    const mockRes = {
      statusCode: 200,
      getHeaders: () => ({ 'content-type': 'application/json' })
    };
    
    const mockResponseData = { success: true, message: 'Test response' };
    const mockResponseTime = 150;
    
    await cloudWatchLogger.logRequestResponse(mockReq, mockRes, mockResponseData, mockResponseTime);
    console.log('✅ Request/Response logging test passed');
    
    console.log('\n🎉 CloudWatch logging is working correctly!');
    console.log('Make sure to set CLOUDWATCH_LOG_GROUP_NAME in your environment variables.');
    
  } catch (error) {
    console.error('❌ CloudWatch logging test failed:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure AWS credentials are properly configured');
    console.log('2. Set CLOUDWATCH_LOG_GROUP_NAME environment variable');
    console.log('3. Verify AWS region is correct');
    console.log('4. Check IAM permissions for CloudWatch Logs');
  }
}

// Run the test
testCloudWatchLogging();
