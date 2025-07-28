const KeycloakAuth = require('./utils/keycloakAuth');
require('dotenv').config();

async function testKeycloakAuth() {
  console.log('🧪 Testing Keycloak Authentication...');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('KEYCLOAK_URL:', process.env.KEYCLOAK_URL);
  console.log('KEYCLOAK_REALM:', process.env.KEYCLOAK_REALM);
  console.log('KEYCLOAK_CLIENT_ID:', process.env.KEYCLOAK_CLIENT_ID);
  console.log('KEYCLOAK_CLIENT_SECRET:', process.env.KEYCLOAK_CLIENT_SECRET ? '***SET***' : 'NOT SET');
  
  try {
    // Test token fetching
    console.log('\n🔑 Attempting to fetch Keycloak token...');
    const token = await KeycloakAuth.getAccessToken();
    
    console.log('✅ Token fetched successfully!');
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 50) + '...');
    
    // Test token info
    const tokenInfo = KeycloakAuth.getTokenInfo();
    console.log('\n📊 Token Info:', tokenInfo);
    
  } catch (error) {
    console.error('❌ Keycloak authentication failed:', error.message);
    console.error('Full error:', error);
  }
}

testKeycloakAuth();
