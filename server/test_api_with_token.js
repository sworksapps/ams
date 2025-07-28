#!/usr/bin/env node

/**
 * Test API endpoints with provided Keycloak token
 */

const fetch = require('node-fetch');

const TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJJMTBFNFQ3Zks3aHJiRFFaUmpOZ0h3b0x4bEo5SXZHc3FDU3NlZ1BQeHpZIn0.eyJleHAiOjE3NTU4NTQ5OTAsImlhdCI6MTc1MzY5NDk5MCwiYXV0aF90aW1lIjoxNzUzNjkyMDIwLCJqdGkiOiJkMDVhODNjNy0zMzc1LTQ2YjItOTIyNC00NmE3MjMwZGQ3YmMiLCJpc3MiOiJodHRwczovL2F1dGgtdWF0LnN3b3Jrcy5jby5pbi9yZWFsbXMvcHJlLXByb2QiLCJhdWQiOlsiYm1zLXJlc3RmdWwtYXBpIiwidGlja2V0aW5nLXJlc3RmdWwtYXBpIiwiU1dBcHAiLCJhY2NvdW50IiwiY3JtLWJhY2tlbmQiXSwic3ViIjoiODJiMDUyOTYtMzAwYy00MTI2LWIyN2YtZGJkOGQ3OGYwOTM1IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYW1zLWZyb250ZW5kIiwic2lkIjoiODVlMWQ5MDgtMDAwNi00MzdhLTk1YzgtMjIyNTA1NmY4MWE4IiwiYWNyIjoiMCIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwOi8vbG9jYWxob3N0OjMwMDAiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbIm9mZmxpbmVfYWNjZXNzIiwiZGVmYXVsdC1yb2xlcy1wcmUtcHJvZCIsInVtYV9hdXRob3JpemF0aW9uIiwicG9ydGZvbGlvLWFkbWluIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYm1zLXJlc3RmdWwtYXBpIjp7InJvbGVzIjpbIlNuYWdBZGQiLCJMQ1MgQWRkaXRpb25hbCBIb3VyIERhc2hib2FyZCIsIkxDU1Jlc291cmNlVmlldyIsIlJvb21Cb29raW5nQWRkIiwiQUNSZXNvdXJjZVZpZXciLCJMQ1NSZXNvdXJjZUNyZWF0ZSIsIkxDU1NjaGVkdWxlRWRpdCIsIlNuYWdWaWV3IiwiQUNSZXNvdXJjZUFkZCIsIkJ1aWxkaW5nQ29tcGxpYW5jZURvY3VtZW50c1ZpZXciLCJBQ1Jlc291cmNlTWFudWFsT04vT0ZGIiwiUm9vbUJvb2tpbmdWaWV3IiwiUHJvamVjdFJlc291cmNlVmlldyIsIlRTUmVzb3VyY2VWaWV3IiwiVFNSZXNvdXJjZUNyZWF0ZSIsIkFDUmVzb3VyY2VFZGl0U2NoZWR1bGUiXX0sInRpY2tldGluZy1yZXN0ZnVsLWFwaSI6eyJyb2xlcyI6WyJDYXRlZ29yeSBNYW5hZ2VyIiwiVGlja2V0IE1hbmFnZXIiLCJVc2VyIE1hbmFnZXIiXX0sIlNXQXBwIjp7InJvbGVzIjpbIk1SX3NlbGZfYW5kX2NsaWVudHMiXX0sImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJ2aWV3LWFwcGxpY2F0aW9ucyIsInZpZXctY29uc2VudCIsInZpZXctZ3JvdXBzIiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJtYW5hZ2UtY29uc2VudCIsImRlbGV0ZS1hY2NvdW50Iiwidmlldy1wcm9maWxlIl19LCJjcm0tYmFja2VuZCI6eyJyb2xlcyI6WyJBZ3JlZW1lbnRzIFZpZXciXX19LCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIHBlcm1pc3Npb24gZW1haWwiLCJvbGRfZGJfaWQiOiIyMTAwODciLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXR0cmlidXRlX2Jhc2VkX2FjY2VzcyI6eyJvcmdhbml6YXRpb25zIjpbeyJvcmdhbml6YXRpb25faWQiOiJmNWMzYzkxMy02ZGI4LTQzMDMtOGFhNS02ZmE5Njk2OTEzZWQifV19LCJhcHBfdXNlcl9pZCI6ImE5NDE1YmEzLTIwNDMtNGFkZC05OWY1LTgwMmJlNmQ4MmE3MyIsIm1lbWJlcnMiOlt7InJlc291cmNlX2lkIjoiZjVjM2M5MTMtNmRiOC00MzAzLThhYTUtNmZhOTY5NjkxM2VkIiwicmVzb3VyY2VfdHlwZSI6InBvcnRmb2xpbyIsInByb3BlcnR5X2lkIjoiYjM1YmRkNjgtNzczMi00ODQ1LWIzMDEtN2NkMzZhMzhiY2Y5IiwiYXBwcm92ZWRfc3RhdHVzIjoiMSJ9XSwibmFtZSI6IkhhcmlwcmFzYWQgSyIsInByZWZlcnJlZF91c2VybmFtZSI6ImhhcmlwcmFzYWQua0Bzd29ya3MuY28uaW4iLCJnaXZlbl9uYW1lIjoiSGFyaXByYXNhZCIsImZhbWlseV9uYW1lIjoiSyIsImVtYWlsIjoiaGFyaXByYXNhZC5rQHN3b3Jrcy5jby5pbiJ9.sVk0p94tzLyx4CHI8Po3eknrlnCR0Mg8O9kxLzVWbCfaBeheG8f1Yyq_5pfunzK4yTO5KC5026rMshx43kyobhRHQnBq6FA0tcs7CheLv0XkdaCyiu9IF9sedcx40BAnVolymaDFRP08nHD8r8ridCgUFz5tSq5fmjUrmoPjwiZzjeDHvt_v5tmwdfvRboXejFzIvyxyShSSdlzlR2Ddn2AUB9F40QYIMjXreMu05JNpfVd6Q65LfYpPeEDOmslCpcWWpy_TDw4lLxAcOl0WKe15jvpD4ojFQyO00gziVCQr3aRb_4MfFhBlNUvft1PF6nbAdXAGP8uo2f6jF9p8Nw";

const BASE_URL = 'http://localhost:5000';

async function testAPI(endpoint, description) {
  try {
    console.log(`\n🔍 Testing ${description}...`);
    console.log(`   URL: ${BASE_URL}${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   Error: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`   Success: Received ${Array.isArray(data) ? data.length : typeof data} items`);
    console.log(`   Data structure:`, JSON.stringify(data, null, 2));
    
    return data;

  } catch (error) {
    console.log(`   Network Error: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Testing API Endpoints with Keycloak Token');
  console.log('==============================================');

  // Test locations endpoint
  const locations = await testAPI('/api/locations', 'Locations API');
  
  // Test categories endpoint  
  const categories = await testAPI('/api/categories', 'Categories API');

  // Test health endpoint
  const health = await testAPI('/api/health', 'Health Check');

  console.log('\n==============================================');
  console.log('📊 SUMMARY:');
  console.log(`   ✅ Locations: ${locations ? (Array.isArray(locations) ? locations.length : 'received') : 'failed'}`);
  console.log(`   ✅ Categories: ${categories ? (Array.isArray(categories) ? categories.length : 'received') : 'failed'}`);
  console.log(`   ✅ Health: ${health ? 'healthy' : 'failed'}`);

  if (locations && Array.isArray(locations) && locations.length > 0) {
    console.log('\n🔍 Location Data Structure Analysis:');
    console.log('   Sample location:', JSON.stringify(locations[0], null, 2));
    
    // Check if locations have the expected structure for dropdown
    const hasExpectedStructure = locations.every(loc => 
      typeof loc === 'object' && 
      (loc.hasOwnProperty('value') || loc.hasOwnProperty('name')) &&
      (loc.hasOwnProperty('label') || loc.hasOwnProperty('name'))
    );
    
    console.log(`   ✅ Has dropdown structure: ${hasExpectedStructure}`);
    
    if (!hasExpectedStructure) {
      console.log('   ⚠️  Locations need to be transformed for dropdown use');
      console.log('   Expected format: { value: string, label: string }');
    }
  }
}

runTests().catch(console.error);
