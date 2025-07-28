import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Core providers and components
import KeycloakProvider from './components/KeycloakProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ScrollProvider } from './contexts/ScrollContext';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Configuration and utilities
import keycloak from './config/keycloak';
import { setKeycloakInstance } from './utils/api';

// Lazy-loaded page components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AssetDashboard = lazy(() => import('./pages/AssetDashboard'));
const AssetManagement = lazy(() => import('./pages/AssetManagement'));
const AssetDetails = lazy(() => import('./pages/AssetDetails'));
const PPMTasks = lazy(() => import('./pages/PPMTasks'));
const MaintenanceSchedules = lazy(() => import('./pages/MaintenanceSchedules'));
const CoverageManagement = lazy(() => import('./pages/CoverageManagement'));
const AMCRenewals = lazy(() => import('./pages/AMCRenewals'));
const TicketManagement = lazy(() => import('./pages/TicketManagement'));
const TicketDetails = lazy(() => import('./pages/TicketDetails'));

// Loading component for Suspense
const LoadingSpinner = () => (
  <div className="app-loading-container">
    <div className="app-loading-spinner"></div>
    <span className="app-loading-text">Loading...</span>
  </div>
);

// Enhanced route configuration with metadata and lazy loading
const ROUTE_CONFIG = {
  // Dashboard routes
  DASHBOARD: {
    routes: [
      { path: '/', element: <Dashboard />, exact: true, title: 'Dashboard' },
      { path: '/dashboard', element: <Dashboard />, title: 'Dashboard' },
    ]
  },
  
  // Asset management routes
  ASSETS: {
    routes: [
      { path: '/assets', element: <AssetDashboard />, title: 'Asset Dashboard' },
      { path: '/assets/manage', element: <AssetManagement />, title: 'Asset Management' },
      { path: '/assets/edit/:id', element: <AssetManagement />, title: 'Edit Asset' },
      { path: '/assets/:id', element: <AssetDetails />, title: 'Asset Details' },
    ]
  },
  
  // Maintenance routes
  MAINTENANCE: {
    routes: [
      { path: '/maintenance', element: <PPMTasks />, title: 'PPM Tasks' },
      { path: '/maintenance/tasks', element: <PPMTasks />, title: 'PPM Tasks' },
      { path: '/maintenance/schedules', element: <MaintenanceSchedules />, title: 'Maintenance Schedules' },
    ]
  },
  
  // Coverage and renewals
  COVERAGE: {
    routes: [
      { path: '/coverage', element: <CoverageManagement />, title: 'Coverage Management' },
      { path: '/amc-renewals', element: <AMCRenewals />, title: 'AMC Renewals' },
    ]
  },
  
  // Ticket management (legacy - mapped to repairs)
  TICKETS: {
    routes: [
      { path: '/tickets', element: <Navigate to="/repairs" replace />, title: 'Repairs' },
      { path: '/tickets/:id', element: <TicketDetails />, title: 'Repair Details' },
      { path: '/repairs', element: <TicketManagement />, title: 'Repairs & Maintenance' },
      { path: '/repairs/:id', element: <TicketDetails />, title: 'Repair Details' },
    ]
  }
};

// Flatten routes for easier iteration
const getAllRoutes = () => {
  return Object.values(ROUTE_CONFIG).flatMap(section => section.routes);
};

// Enhanced App component with protected routes and performance optimizations
const AppRoutes = () => {
  const routes = getAllRoutes();
  
  return (
    <ScrollProvider>
      <Router>
        <ProtectedRoute>
          <Layout>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {routes.map(({ path, element, exact }) => (
                  <Route 
                    key={path} 
                    path={path} 
                    element={element}
                    {...(exact && { index: true })}
                  />
                ))}
                {/* Catch-all route for 404 handling */}
                <Route 
                  path="*" 
                  element={
                    <div className="app-error-container">
                      <div className="app-error-content">
                        <h1 className="app-error-title">404</h1>
                        <p className="app-error-message">Page not found</p>
                        <Navigate to="/" replace />
                      </div>
                    </div>
                  } 
                />
              </Routes>
            </Suspense>
          </Layout>
        </ProtectedRoute>
      </Router>
    </ScrollProvider>
  );
};

// Main App component with enhanced error handling and initialization
function App() {
  useEffect(() => {
    // Set keycloak instance for API utils once initialized
    try {
      setKeycloakInstance(keycloak);
      
      // Set document title for better UX
      document.title = 'Asset Management System';
      
      // Development mode logging
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Asset Management System initialized');
        console.log('📊 Available routes:', getAllRoutes().length);
      }
    } catch (error) {
      console.error('❌ App initialization error:', error);
    }
  }, []);

  return (
    <ErrorBoundary>
      <KeycloakProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </KeycloakProvider>
    </ErrorBoundary>
  );
}

export default App;
