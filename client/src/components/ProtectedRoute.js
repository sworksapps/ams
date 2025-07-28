import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, roles = [], fallback = null }) => {
  // Always call hooks first (React rules)
  const { authenticated, loading, user, hasAnyRole, initialized } = useAuth();

  // Debug logging
  console.log('🔐 ProtectedRoute render:', {
    initialized,
    loading,
    authenticated,
    user: user ? 'Present' : 'Null'
  });

  // Show loading while authentication is being determined
  if (!initialized || loading) {
    console.log('🔐 Authentication loading, showing loading...');
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          padding: '40px',
          textAlign: 'center',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '400px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e3f2fd',
            borderTop: '4px solid #2196f3',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h3 style={{ margin: '0 0 10px', color: '#333' }}>Authenticating...</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
            Please wait while we verify your credentials
          </p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // If not authenticated, Keycloak login-required will handle the redirect automatically
  // No manual redirect logic needed
  if (!authenticated) {
    console.log('🔐 User not authenticated - Keycloak should handle redirect');
    return null;
  }

  // Check if user has required roles (if any specified)
  if (roles.length > 0 && !hasAnyRole(roles)) {
    console.log('🔐 User authenticated but lacks required roles:', { userRoles: user?.roles, requiredRoles: roles });
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '16px' }}>Access Denied</h2>
          <p style={{ color: '#666', marginBottom: '16px' }}>You don't have permission to access this page.</p>
          <p style={{ fontSize: '14px', color: '#999' }}>Required roles: {roles.join(', ')}</p>
        </div>
      </div>
    );
  }

  // If authenticated and has required roles, render children
  console.log('🔐 User authenticated and authorized, rendering children');
  return children;
};

export default ProtectedRoute;
