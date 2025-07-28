import React, { createContext, useContext, useEffect, useState } from 'react';
import { useKeycloak } from '../components/KeycloakProvider';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { keycloak, initialized } = useKeycloak();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Enhanced effect to handle authentication state changes
  useEffect(() => {
    console.log('🔐 AuthContext effect triggered:', {
      initialized,
      keycloakAuthenticated: keycloak?.authenticated,
      keycloakToken: keycloak?.token ? 'Present' : 'Missing'
    });

    if (initialized && keycloak) {
      const isAuthenticated = keycloak.authenticated && keycloak.token;
      
      if (isAuthenticated) {
        // Extract user information from token
        const tokenParsed = keycloak.tokenParsed;
        const userInfo = {
          id: tokenParsed?.sub,
          email: tokenParsed?.email,
          name: tokenParsed?.name || tokenParsed?.preferred_username,
          phone: tokenParsed?.phone_number || tokenParsed?.phone,
          username: tokenParsed?.preferred_username,
          roles: tokenParsed?.realm_access?.roles || [],
          groups: tokenParsed?.groups || []
        };
        setUser(userInfo);
        setAuthenticated(true);
        console.log('🔐 User authenticated:', userInfo);
        
        // Update API instance with the authenticated keycloak instance
        import('../utils/api').then(({ setKeycloakInstance }) => {
          setKeycloakInstance(keycloak);
          console.log('🔐 Updated API with authenticated Keycloak instance');
        });
      } else {
        setUser(null);
        setAuthenticated(false);
        console.log('🔐 User not authenticated');
      }
      setLoading(false);
    }
  }, [keycloak, initialized, keycloak?.authenticated, keycloak?.token]);

  // Auto-refresh token
  useEffect(() => {
    if (keycloak.authenticated) {
      // Set up token refresh
      const refreshInterval = setInterval(() => {
        keycloak.updateToken(30).then((refreshed) => {
          if (refreshed) {
            console.log('🔄 Token refreshed');
          }
        }).catch((error) => {
          console.error('❌ Token refresh failed:', error);
          logout();
        });
      }, 10000); // Check every 10 seconds

      return () => clearInterval(refreshInterval);
    }
  }, [keycloak.authenticated]);

  const login = () => {
    try {
      console.log('🔐 Initiating login using Keycloak login method...');
      
      // Use the standard Keycloak login method instead of manual redirect
      keycloak.login({
        redirectUri: window.location.origin + '/'
      });
    } catch (error) {
      console.error('🔐 Login failed:', error);
    }
  };

  const logout = () => {
    console.log('🔐 Initiating logout...');
    setUser(null);
    keycloak.logout({
      redirectUri: window.location.origin
    });
  };

  const hasRole = (role) => {
    return user?.roles?.includes(role) || false;
  };

  const hasAnyRole = (roles) => {
    return roles.some(role => hasRole(role));
  };

  const getToken = () => {
    return keycloak.token;
  };

  const isTokenExpired = () => {
    return keycloak.isTokenExpired();
  };

  const value = {
    // Authentication state
    authenticated,
    initialized,
    loading,
    user,
    
    // Authentication methods
    login,
    logout,
    
    // Role checking
    hasRole,
    hasAnyRole,
    
    // Token management
    getToken,
    isTokenExpired,
    
    // Keycloak instance (for advanced usage)
    keycloak
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
