import React, { useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Wrench, 
  Shield, 
  Ticket,
  Menu,
  X,
  Home,
  Settings,
  RefreshCw
} from 'lucide-react';
import UserProfile from '../UserProfile';
import './Layout.css';

// Constants
const APP_NAME = 'Asset Manager';
const SIDEBAR_WIDTH = 'w-64';

// Navigation configuration
const NAVIGATION_ITEMS = [
  { name: 'Assets Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Asset Management', href: '/assets', icon: Package },
  { name: 'PPM Schedules', href: '/maintenance/schedules', icon: Settings },
  { name: 'PPM Tasks', href: '/maintenance/tasks', icon: Wrench },
  { name: 'AMC', href: '/coverage', icon: Shield },
  { name: 'AMC Renewals', href: '/amc-renewals', icon: RefreshCw },
  { name: 'R&M', href: '/tickets', icon: Ticket },
];

// Parent-child route relationships for navigation highlighting
const PARENT_CHILD_RELATIONS = {
  '/maintenance': ['/maintenance/tasks', '/maintenance/schedules'],
  '/assets': ['/assets/management']
};

// CSS classes for consistent styling
const STYLES = {
  activeNavItem: 'layout-nav-item-active',
  inactiveNavItem: 'layout-nav-item-inactive',
  activeIcon: 'layout-nav-icon-active',
  inactiveIcon: 'layout-nav-icon-inactive',
  navItemBase: 'layout-nav-item-base'
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Memoized active state checker for better performance
  const isActive = useCallback((path) => {
    const currentPath = location.pathname;
    
    // Root path exact match
    if (path === '/') {
      return currentPath === '/';
    }
    
    // Exact match
    if (currentPath === path) {
      return true;
    }
    
    // If current path is a child of this nav item, don't highlight the parent
    if (PARENT_CHILD_RELATIONS[path]) {
      const isChildActive = PARENT_CHILD_RELATIONS[path].some(childPath => currentPath === childPath);
      if (isChildActive) {
        return false;
      }
    }
    
    // For other cases, check if current path starts with nav path + slash
    return currentPath.startsWith(path + '/');
  }, [location.pathname]);

  // Optimized event handlers
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Memoized navigation items with active state
  const navigationWithActiveState = useMemo(() => {
    return NAVIGATION_ITEMS.map(item => ({
      ...item,
      isActive: isActive(item.href)
    }));
  }, [isActive]);

  return (
    <div className="layout-container">
      {/* Mobile sidebar */}
      <div className={`layout-mobile-overlay ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="layout-mobile-backdrop" onClick={handleSidebarClose} />
        <div className="layout-mobile-sidebar">
          <div className="layout-sidebar-header-mobile">
            <h1 className="layout-app-title">{APP_NAME}</h1>
            <button
              onClick={handleSidebarClose}
              className="layout-close-button"
            >
              <X className="layout-close-icon" />
            </button>
          </div>
          <nav className="layout-nav">
            {navigationWithActiveState.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={handleSidebarClose}
                  className={`${STYLES.navItemBase} ${
                    item.isActive ? STYLES.activeNavItem : STYLES.inactiveNavItem
                  }`}
                >
                  <Icon className={`layout-nav-icon ${
                    item.isActive ? STYLES.activeIcon : STYLES.inactiveIcon
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="layout-desktop-sidebar">
        <div className="layout-sidebar-content">
          <div className="layout-sidebar-header">
            <Home className="layout-app-icon" />
            <h1 className="layout-app-title">{APP_NAME}</h1>
          </div>
          <nav className="layout-nav">
            {navigationWithActiveState.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${STYLES.navItemBase} ${
                    item.isActive ? STYLES.activeNavItem : STYLES.inactiveNavItem
                  }`}
                >
                  <Icon className={`layout-nav-icon ${
                    item.isActive ? STYLES.activeIcon : STYLES.inactiveIcon
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="layout-main-content">
        {/* Top bar */}
        <div className="layout-top-bar">
          <button
            type="button"
            className="layout-menu-button"
            onClick={handleSidebarToggle}
          >
            <Menu className="layout-menu-icon" />
          </button>

          <div className="layout-top-bar-content">
            <div className="layout-top-bar-left">
              <div className="layout-divider" />
            </div>
            <div className="layout-top-bar-right">
              <div className="layout-user-section">
                <UserProfile />
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="layout-page-content">
          <div className="layout-content-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
