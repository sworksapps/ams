#!/usr/bin/env node

/**
 * Comprehensive Asset Management Test Script
 * Tests location dropdown data, asset creation, and asset editing
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Mock authentication headers (you may need to adjust these based on your auth system)
const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  // Add your authentication headers here if needed
  // 'Authorization': 'Bearer your-token-here'
};

class AssetManagementTester {
  constructor() {
    this.testResults = [];
    this.createdAssetId = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logEntry);
    this.testResults.push({ timestamp, type, message });
  }

  async testHealthCheck() {
    try {
      this.log('Testing server health check...');
      const response = await axios.get(`${BASE_URL}/api/health`);
      this.log(`Health check passed: ${JSON.stringify(response.data)}`, 'success');
      return true;
    } catch (error) {
      this.log(`Health check failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testLocationAPI() {
    try {
      this.log('Testing locations API endpoint...');
      
      // Test the locations endpoint that the frontend uses
      const response = await axios.get(`${BASE_URL}/api/assets/data/locations`, {
        headers: AUTH_HEADERS
      });
      
      this.log(`Locations API Response Status: ${response.status}`, 'info');
      this.log(`Locations API Response Data: ${JSON.stringify(response.data, null, 2)}`, 'info');
      
      // Check if data is in expected format for dropdown
      if (Array.isArray(response.data)) {
        this.log(`Found ${response.data.length} locations`, 'success');
        
        // Check if locations have the expected structure (value, label)
        const firstLocation = response.data[0];
        if (firstLocation && firstLocation.value && firstLocation.label) {
          this.log('Location data structure is correct for dropdown', 'success');
        } else {
          this.log('Location data structure may be incorrect for dropdown', 'warning');
          this.log(`Expected: {value, label}, Got: ${JSON.stringify(firstLocation)}`, 'warning');
        }
      } else {
        this.log('Locations API did not return an array', 'error');
      }
      
      return response.data;
    } catch (error) {
      this.log(`Locations API test failed: ${error.message}`, 'error');
      if (error.response) {
        this.log(`Response status: ${error.response.status}`, 'error');
        this.log(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
      }
      return null;
    }
  }

  async testCategoriesAPI() {
    try {
      this.log('Testing categories API endpoint...');
      
      const response = await axios.get(`${BASE_URL}/api/categories`, {
        headers: AUTH_HEADERS
      });
      
      this.log(`Categories API Response Status: ${response.status}`, 'info');
      this.log(`Found ${response.data.length} categories`, 'success');
      
      return response.data;
    } catch (error) {
      this.log(`Categories API test failed: ${error.message}`, 'error');
      if (error.response) {
        this.log(`Response status: ${error.response.status}`, 'error');
        this.log(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
      }
      return null;
    }
  }

  async testAssetCreation() {
    try {
      this.log('Testing asset creation...');
      
      // Sample asset data
      const assetData = {
        equipment_name: 'Test Asset ' + Date.now(),
        category: 'IT Equipment',
        location: 'Test Location',
        asset_type: 'common',
        client: '',
        floor: 'Ground Floor',
        model_number: 'TEST-001',
        capacity: '100',
        manufacturer: 'Test Manufacturer',
        serial_number: 'SN' + Date.now(),
        purchase_price: '50000',
        poc_number: '1234567890',
        poc_name: 'Test POC',
        owned_by: 'Landlord',
        subcategory: 'Computers',
        make: 'Test Make',
        unit: 'Piece',
        photos: [],
        maintenance_schedules: [],
        coverage: {
          vendor_name: 'Test Vendor',
          coverage_type: 'AMC',
          amc_po: 'PO123',
          amc_po_date: '2024-01-01',
          amc_amount: '10000',
          amc_type: 'Annual',
          period_from: '2024-01-01',
          period_till: '2024-12-31',
          month_of_expiry: '12',
          remarks: 'Test asset for automated testing',
          assets_owner: 'Test Owner',
          types_of_service: 'Maintenance'
        }
      };

      const response = await axios.post(`${BASE_URL}/api/assets`, assetData, {
        headers: AUTH_HEADERS
      });

      this.log(`Asset creation response status: ${response.status}`, 'info');
      this.log(`Asset creation response: ${JSON.stringify(response.data, null, 2)}`, 'info');

      if (response.data && response.data.id) {
        this.createdAssetId = response.data.id;
        this.log(`Asset created successfully with ID: ${this.createdAssetId}`, 'success');
        return true;
      } else {
        this.log('Asset creation response did not include asset ID', 'warning');
        return false;
      }

    } catch (error) {
      this.log(`Asset creation failed: ${error.message}`, 'error');
      if (error.response) {
        this.log(`Response status: ${error.response.status}`, 'error');
        this.log(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
      }
      return false;
    }
  }

  async testAssetRetrieval() {
    if (!this.createdAssetId) {
      this.log('No asset ID available for retrieval test', 'warning');
      return false;
    }

    try {
      this.log(`Testing asset retrieval for ID: ${this.createdAssetId}...`);
      
      const response = await axios.get(`${BASE_URL}/api/assets/${this.createdAssetId}`, {
        headers: AUTH_HEADERS
      });

      this.log(`Asset retrieval response status: ${response.status}`, 'info');
      this.log(`Retrieved asset: ${JSON.stringify(response.data, null, 2)}`, 'info');

      if (response.data && response.data.id === this.createdAssetId) {
        this.log('Asset retrieval successful', 'success');
        return true;
      } else {
        this.log('Asset retrieval returned unexpected data', 'warning');
        return false;
      }

    } catch (error) {
      this.log(`Asset retrieval failed: ${error.message}`, 'error');
      if (error.response) {
        this.log(`Response status: ${error.response.status}`, 'error');
        this.log(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
      }
      return false;
    }
  }

  async testAssetUpdate() {
    if (!this.createdAssetId) {
      this.log('No asset ID available for update test', 'warning');
      return false;
    }

    try {
      this.log(`Testing asset update for ID: ${this.createdAssetId}...`);
      
      const updateData = {
        equipment_name: 'Updated Test Asset ' + Date.now(),
        capacity: '200', // Changed from 100 to 200
        purchase_price: '75000', // Changed from 50000 to 75000
        coverage: {
          vendor_name: 'Updated Test Vendor',
          coverage_type: 'AMC',
          amc_po: 'PO456',
          amc_amount: '15000',
          remarks: 'Updated test asset for automated testing'
        }
      };

      const response = await axios.put(`${BASE_URL}/api/assets/${this.createdAssetId}`, updateData, {
        headers: AUTH_HEADERS
      });

      this.log(`Asset update response status: ${response.status}`, 'info');
      this.log(`Asset update response: ${JSON.stringify(response.data, null, 2)}`, 'info');

      if (response.status === 200) {
        this.log('Asset update successful', 'success');
        return true;
      } else {
        this.log('Asset update returned unexpected status', 'warning');
        return false;
      }

    } catch (error) {
      this.log(`Asset update failed: ${error.message}`, 'error');
      if (error.response) {
        this.log(`Response status: ${error.response.status}`, 'error');
        this.log(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
      }
      return false;
    }
  }

  async testAssetsList() {
    try {
      this.log('Testing assets list endpoint...');
      
      const response = await axios.get(`${BASE_URL}/api/assets`, {
        headers: AUTH_HEADERS
      });

      this.log(`Assets list response status: ${response.status}`, 'info');
      
      if (Array.isArray(response.data)) {
        this.log(`Found ${response.data.length} assets in the system`, 'success');
        
        // Check if our created asset is in the list
        if (this.createdAssetId) {
          const foundAsset = response.data.find(asset => asset.id === this.createdAssetId);
          if (foundAsset) {
            this.log('Created asset found in assets list', 'success');
          } else {
            this.log('Created asset not found in assets list', 'warning');
          }
        }
        
        return true;
      } else {
        this.log('Assets list did not return an array', 'error');
        return false;
      }

    } catch (error) {
      this.log(`Assets list test failed: ${error.message}`, 'error');
      if (error.response) {
        this.log(`Response status: ${error.response.status}`, 'error');
        this.log(`Response data: ${JSON.stringify(error.response.data)}`, 'error');
      }
      return false;
    }
  }

  async cleanup() {
    if (this.createdAssetId) {
      try {
        this.log(`Cleaning up: Deleting test asset ${this.createdAssetId}...`);
        
        const response = await axios.delete(`${BASE_URL}/api/assets/${this.createdAssetId}`, {
          headers: AUTH_HEADERS
        });

        this.log(`Asset deletion response status: ${response.status}`, 'info');
        this.log('Test asset cleanup completed', 'success');

      } catch (error) {
        this.log(`Asset cleanup failed: ${error.message}`, 'warning');
        this.log('You may need to manually delete the test asset', 'warning');
      }
    }
  }

  async runAllTests() {
    this.log('Starting comprehensive Asset Management System tests...', 'info');
    this.log('='.repeat(60), 'info');

    const tests = [
      { name: 'Health Check', fn: () => this.testHealthCheck() },
      { name: 'Location API', fn: () => this.testLocationAPI() },
      { name: 'Categories API', fn: () => this.testCategoriesAPI() },
      { name: 'Asset Creation', fn: () => this.testAssetCreation() },
      { name: 'Asset Retrieval', fn: () => this.testAssetRetrieval() },
      { name: 'Asset Update', fn: () => this.testAssetUpdate() },
      { name: 'Assets List', fn: () => this.testAssetsList() }
    ];

    const results = {};
    
    for (const test of tests) {
      this.log(`\n--- Running ${test.name} Test ---`, 'info');
      try {
        results[test.name] = await test.fn();
      } catch (error) {
        this.log(`Unexpected error in ${test.name}: ${error.message}`, 'error');
        results[test.name] = false;
      }
    }

    // Cleanup
    this.log('\n--- Cleanup ---', 'info');
    await this.cleanup();

    // Summary
    this.log('\n' + '='.repeat(60), 'info');
    this.log('TEST SUMMARY', 'info');
    this.log('='.repeat(60), 'info');

    let passedTests = 0;
    let totalTests = Object.keys(results).length;

    for (const [testName, passed] of Object.entries(results)) {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      this.log(`${testName}: ${status}`, passed ? 'success' : 'error');
      if (passed) passedTests++;
    }

    this.log(`\nOverall Result: ${passedTests}/${totalTests} tests passed`, 
             passedTests === totalTests ? 'success' : 'warning');

    if (passedTests < totalTests) {
      this.log('\nSome tests failed. Check the logs above for details.', 'warning');
      this.log('Common issues:', 'info');
      this.log('- Authentication headers may be missing or incorrect', 'info');
      this.log('- Database connection issues', 'info');
      this.log('- API endpoint changes', 'info');
      this.log('- Data format mismatches', 'info');
    } else {
      this.log('\nAll tests passed! 🎉', 'success');
      this.log('Your Asset Management System is working correctly.', 'success');
    }

    return results;
  }
}

// Run the tests
if (require.main === module) {
  const tester = new AssetManagementTester();
  tester.runAllTests()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = AssetManagementTester;
