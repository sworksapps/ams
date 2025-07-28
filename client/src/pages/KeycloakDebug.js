import React from 'react';
import { useKeycloak } from '../components/KeycloakProvider';
import { useAuth } from '../contexts/AuthContext';

const KeycloakDebug = () => {
  const { keycloak, initialized, authenticated, loading, error } = useKeycloak();
  const { user } = useAuth();

  const handleLogin = () => {
    console.log('🔐 Manual login triggered');
    keycloak.login({
      redirectUri: window.location.origin + '/'
    });
  };

  const handleLogout = () => {
    console.log('🔐 Manual logout triggered');
    keycloak.logout({
      redirectUri: window.location.origin + '/'
    });
  };

  const checkToken = () => {
    console.log('🔐 Current Keycloak state:', {
      authenticated: keycloak.authenticated,
      token: keycloak.token ? 'Present' : 'Missing',
      tokenParsed: keycloak.tokenParsed,
      refreshToken: keycloak.refreshToken ? 'Present' : 'Missing',
      realm: keycloak.realm,
      clientId: keycloak.clientId,
      authServerUrl: keycloak.authServerUrl
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔐 Keycloak Debug Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Provider State:</h2>
        <ul>
          <li>Initialized: {initialized ? '✅' : '❌'}</li>
          <li>Authenticated: {authenticated ? '✅' : '❌'}</li>
          <li>Loading: {loading ? '⏳' : '✅'}</li>
          <li>Error: {error ? '❌ ' + error.message : '✅'}</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Keycloak Instance:</h2>
        <ul>
          <li>Authenticated: {keycloak?.authenticated ? '✅' : '❌'}</li>
          <li>Token: {keycloak?.token ? '✅ Present' : '❌ Missing'}</li>
          <li>Refresh Token: {keycloak?.refreshToken ? '✅ Present' : '❌ Missing'}</li>
          <li>Realm: {keycloak?.realm || 'Not set'}</li>
          <li>Client ID: {keycloak?.clientId || 'Not set'}</li>
          <li>Auth Server URL: {keycloak?.authServerUrl || 'Not set'}</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>User Info:</h2>
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Token Parsed:</h2>
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(keycloak?.tokenParsed, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Actions:</h2>
        <button 
          onClick={handleLogin}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔐 Login
        </button>
        <button 
          onClick={handleLogout}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🚪 Logout
        </button>
        <button 
          onClick={checkToken}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔍 Check Token
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Current URL:</h2>
        <p>{window.location.href}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>URL Parameters:</h2>
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(Object.fromEntries(new URLSearchParams(window.location.search)), null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>URL Hash:</h2>
        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>
          {window.location.hash}
        </pre>
      </div>
    </div>
  );
};

export default KeycloakDebug;
