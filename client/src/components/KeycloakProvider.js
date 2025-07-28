import React, { createContext, useContext, useEffect, useState } from 'react';
import keycloak, { keycloakInitOptions } from '../config/keycloak';
import LoadingSpinner from './LoadingSpinner';

const KeycloakContext = createContext();

export const useKeycloak = () => {
  const context = useContext(KeycloakContext);
  if (!context) {
    throw new Error('useKeycloak must be used within a KeycloakProvider');
  }
  return context;
};

export const KeycloakProvider = ({ children }) => {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initKeycloak = async () => {
      try {
        // Check if Keycloak is already initialized
        if (keycloak && (initialized || keycloak.didInitialize)) {
          console.log('🔐 Keycloak already initialized, using existing state');
          if (isMounted) {
            setInitialized(true);
            setAuthenticated(keycloak.authenticated || false);
            setLoading(false);
          }
          return;
        }

        console.log('🔐 Starting Keycloak initialization with options:', keycloakInitOptions);
        
        // Initialize Keycloak with error handling for double initialization
        let auth;
        try {
          auth = await keycloak.init(keycloakInitOptions);
        } catch (initError) {
          // Handle the "already initialized" error specifically
          if (initError.message && initError.message.includes('can only be initialized once')) {
            console.log('🔐 Keycloak already initialized (caught error), using existing state');
            auth = keycloak.authenticated || false;
          } else {
            throw initError; // Re-throw other errors
          }
        }
        
        console.log('🔐 Keycloak init completed:', {
          auth,
          authenticated: keycloak.authenticated,
          hasToken: !!keycloak.token,
          isMounted,
          onLoad: keycloakInitOptions.onLoad
        });
        
        // Handle potential race condition - if component unmounted, we still need to update state
        // for when it remounts, but we'll do it more carefully
        if (!isMounted) {
          console.log('🔐 Component unmounted during init, but will update state anyway for remount');
          // Don't return - continue with state update for when component remounts
        }
        
        // Handle login requirement first
        if (keycloakInitOptions.onLoad === 'login-required' && !auth) {
          console.log('🔐 Login required but not authenticated, redirecting...');
          await keycloak.login({
            redirectUri: window.location.origin + '/'
          });
          return; // Exit early, don't update state
        }
        
        // Force state update with explicit values
        console.log('🔐 Updating KeycloakProvider state:', {
          initialized: true,
          authenticated: auth,
          loading: false,
          keycloakAuth: keycloak.authenticated,
          tokenPresent: !!keycloak.token
        });
        
        // Update state with error handling
        try {
          setInitialized(true);
          setAuthenticated(auth);
          setLoading(false);
          
          console.log('🔐 State updated successfully:', {
            initialized: true,
            authenticated: auth,
            loading: false,
            isMounted
          });
          
          // Force a re-render by updating the context
          if (auth && keycloak.token) {
            console.log('🔐 Forcing context update with authenticated state');
          }
          
        } catch (stateError) {
          console.error('🔐 Error updating state:', stateError);
          // Try again after a brief delay
          setTimeout(() => {
            try {
              setInitialized(true);
              setAuthenticated(auth);
              setLoading(false);
              console.log('🔐 State update retry successful');
            } catch (retryError) {
              console.error('🔐 State update retry failed:', retryError);
            }
          }, 50);
        }
        
        // Set up token refresh if authenticated
        if (auth) {
          keycloak.onTokenExpired = () => {
            console.log('🔐 Token expired, refreshing...');
            keycloak.updateToken(30).then((refreshed) => {
              if (refreshed) {
                console.log('🔐 Token refreshed successfully');
              } else {
                console.log('🔐 Token is still valid');
              }
            }).catch(() => {
              console.error('🔐 Failed to refresh token');
              if (isMounted) {
                setAuthenticated(false);
              }
            });
          };
        }

      } catch (err) {
        console.error('🔐 Keycloak initialization failed:', err);
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    initKeycloak();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = () => {
    console.log('🔐 Triggering Keycloak login...');
    try {
      keycloak.login({
        redirectUri: window.location.origin + '/'
      });
    } catch (error) {
      console.error('🔐 Login error:', error);
    }
  };

  const logout = () => {
    console.log('🔐 Triggering Keycloak logout...');
    keycloak.logout({
      redirectUri: window.location.origin + '/'
    });
  };

  const value = {
    keycloak,
    initialized,
    authenticated,
    loading,
    error,
    login,
    logout
  };

  if (loading) {
    return <LoadingSpinner message="Initializing authentication..." />;
  }

  if (error) {
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>
          🚨 Authentication Error
        </h2>
        <p style={{ marginBottom: '20px', maxWidth: '600px' }}>
          Failed to initialize authentication system. Please check your connection and try again.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          🔄 Retry
        </button>
        {process.env.NODE_ENV === 'development' && (
          <details style={{ marginTop: '20px', maxWidth: '800px', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              🔍 Error Details (Development Only)
            </summary>
            <pre style={{ 
              backgroundColor: '#f1f1f1', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px',
              marginTop: '10px'
            }}>
              {error.toString()}
            </pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <KeycloakContext.Provider value={value}>
      {children}
    </KeycloakContext.Provider>
  );
};

export default KeycloakProvider;
