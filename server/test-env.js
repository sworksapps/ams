require('dotenv').config();

console.log('🔍 Environment Variables Check:');
console.log('================================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('CENTRAL_LOCATION_BASE_URL:', process.env.CENTRAL_LOCATION_BASE_URL);
console.log('EXTERNAL_TICKETING_BASE_URL:', process.env.EXTERNAL_TICKETING_BASE_URL);
console.log('EXTERNAL_LOCATION_BASE_URL:', process.env.EXTERNAL_LOCATION_BASE_URL);
console.log('KEYCLOAK_URL:', process.env.KEYCLOAK_URL);
console.log('KEYCLOAK_REALM:', process.env.KEYCLOAK_REALM);
console.log('KEYCLOAK_CLIENT_ID:', process.env.KEYCLOAK_CLIENT_ID);
console.log('KEYCLOAK_CLIENT_SECRET:', process.env.KEYCLOAK_CLIENT_SECRET ? '***SET***' : 'NOT SET');
console.log('DEFAULT_COMPANY_ID:', process.env.DEFAULT_COMPANY_ID);
console.log('DEFAULT_COMPANY_NAME:', process.env.DEFAULT_COMPANY_NAME);
console.log('================================');

// Test if the required variables are present
const requiredVars = [
  'CENTRAL_LOCATION_BASE_URL',
  'EXTERNAL_TICKETING_BASE_URL', 
  'EXTERNAL_LOCATION_BASE_URL',
  'KEYCLOAK_URL',
  'KEYCLOAK_REALM',
  'KEYCLOAK_CLIENT_ID',
  'KEYCLOAK_CLIENT_SECRET'
];

console.log('\n✅ Required Variables Status:');
let allPresent = true;
requiredVars.forEach(varName => {
  const isPresent = !!process.env[varName];
  console.log(`${isPresent ? '✅' : '❌'} ${varName}: ${isPresent ? 'SET' : 'MISSING'}`);
  if (!isPresent) allPresent = false;
});

console.log(`\n${allPresent ? '🎉 All required variables are set!' : '⚠️  Some required variables are missing!'}`);
