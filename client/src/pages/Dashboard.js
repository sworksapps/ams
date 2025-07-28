import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Wrench, 
  AlertTriangle, 
  Shield, 
  Calendar, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Package
} from 'lucide-react';
import { assetsAPI } from '../utils/api';
import { useScrollManagement } from '../hooks/useScrollManagement';
import KPICard from '../components/KPICard/KPICard';
import './Dashboard.css';

// Enhanced Constants Configuration
const DASHBOARD_CONFIG = {
  REFRESH_INTERVAL: 30000, // 30 seconds
  SEARCH_DEBOUNCE: 300, // milliseconds
  MAX_LOCATIONS_DISPLAY: 50,
  DEFAULT_PAGE_SIZE: 10
};

const KPI_COLORS = {
  blue: 'dashboard-kpi-card-blue',
  green: 'dashboard-kpi-card-green',
  orange: 'dashboard-kpi-card-orange',
  red: 'dashboard-kpi-card-red'
};

const UI_CLASSES = {
  cellHover: 'dashboard-cell-button dashboard-cell-button-default',
  criticalCell: {
    red: 'dashboard-cell-button dashboard-cell-button-red',
    orange: 'dashboard-cell-button dashboard-cell-button-orange',
    green: 'dashboard-cell-button dashboard-cell-button-green',
    gray: 'dashboard-cell-button dashboard-cell-button-gray'
  },
  tableHeader: 'dashboard-table-header',
  tableCell: 'dashboard-table-cell',
  expandedRow: 'dashboard-expanded-row'
};

// Navigation Routes Configuration
const NAVIGATION_ROUTES = {
  ASSETS: '/assets',
  REPAIRS: '/repairs',
  PPM_TASKS: '/maintenance/tasks',
  AMC_RENEWALS: '/amc-renewals',
  COVERAGE: '/coverage'
};

// KPI Configuration - 5 comprehensive asset management KPIs
const KPI_CONFIG = [
  {
    key: 'assetsOverview',
    title: 'Assets Overview',
    subtitle: 'Total & Categories',
    icon: Package,
    color: 'blue',
    getValue: (data) => ({
      primary: data.totalAssets || 0,
      secondary: `${data.uniqueCategories || 0} Categories`
    }),
    route: NAVIGATION_ROUTES.ASSETS
  },
  {
    key: 'coverageStatus',
    title: 'Coverage Status',
    subtitle: 'Active vs No Coverage',
    icon: Shield,
    color: 'green',
    getValue: (data) => ({
      primary: data.activeCoverage || 0,
      secondary: `${data.noCoverage || 0} Uncovered`
    }),
    route: NAVIGATION_ROUTES.AMC_RENEWALS
  },
  {
    key: 'repairsBreakdowns',
    title: 'Repairs & Issues',
    subtitle: 'Open Repairs & Breakdowns',
    icon: Wrench,
    color: 'orange',
    getValue: (data) => ({
      primary: data.openRepairs || 0,
      secondary: `${data.breakdowns || 0} Breakdowns`
    }),
    route: NAVIGATION_ROUTES.REPAIRS
  },
  {
    key: 'ppmStatus',
    title: 'PPM Status',
    subtitle: 'Open & Overdue Tasks',
    icon: Calendar,
    color: 'blue',
    getValue: (data) => ({
      primary: data.openPPM || 0,
      secondary: `${data.overduePPM || 0} Overdue`
    }),
    route: NAVIGATION_ROUTES.PPM_TASKS
  },
  {
    key: 'coverageExpiry',
    title: 'Coverage Expiry',
    subtitle: 'Expired & Expiring Soon',
    icon: AlertTriangle,
    color: 'red',
    getValue: (data) => ({
      primary: data.expiredAMC || 0,
      secondary: `${data.expiringSoon || 0} Expiring`
    }),
    route: NAVIGATION_ROUTES.AMC_RENEWALS
  }
];

// Mock data configuration - to be replaced with API calls
const MOCK_DATA = {
  categoryData: {
    1: [
      { category: 'HVAC Systems', totalAssets: 12, openRepairs: 3, breakdowns: 1, openTasks: 4, overdue: 1, active: 12, expiring: 2, expired: 0, noCoverage: 1 },
      { category: 'Electrical', totalAssets: 8, openRepairs: 2, breakdowns: 0, openTasks: 3, overdue: 0, active: 8, expiring: 1, expired: 0, noCoverage: 0 },
      { category: 'Plumbing', totalAssets: 5, openRepairs: 1, breakdowns: 0, openTasks: 2, overdue: 1, active: 5, expiring: 0, expired: 1, noCoverage: 0 }
    ],
    2: [
      { category: 'Medical Equipment', totalAssets: 21, openRepairs: 4, breakdowns: 2, openTasks: 6, overdue: 2, active: 15, expiring: 3, expired: 1, noCoverage: 2 },
      { category: 'IT Infrastructure', totalAssets: 11, openRepairs: 1, breakdowns: 0, openTasks: 2, overdue: 0, active: 10, expiring: 1, expired: 0, noCoverage: 0 }
    ],
    3: [
      { category: 'Kitchen Equipment', totalAssets: 11, openRepairs: 2, breakdowns: 1, openTasks: 3, overdue: 1, active: 8, expiring: 2, expired: 0, noCoverage: 1 }
    ]
  },
  
  globalKPIs: {
    // Assets Overview KPI
    totalAssets: 2847,
    uniqueCategories: 15,
    
    // Coverage Status KPI
    activeCoverage: 2234,
    noCoverage: 613,
    
    // Repairs & Issues KPI
    openRepairs: 23,
    breakdowns: 5,
    
    // PPM Status KPI
    openPPM: 67,
    overduePPM: 11,
    
    // Coverage Expiry KPI
    expiredAMC: 39,
    expiringSoon: 84
  },
  
  locationSummary: [
    { id: 1, location: 'Mumbai - Andheri', totalAssets: 245, openRepairs: 3, breakdowns: 1, amcActive: 180, amcExpiringSoon: 12, amcExpired: 8, noCoverage: 45, maintenanceSchedules: 156, openPPM: 8, overduePPM: 2 },
    { id: 2, location: 'Delhi - Connaught Place', totalAssets: 189, openRepairs: 5, breakdowns: 0, amcActive: 145, amcExpiringSoon: 8, amcExpired: 3, noCoverage: 33, maintenanceSchedules: 120, openPPM: 12, overduePPM: 1 },
    { id: 3, location: 'Bangalore - Whitefield', totalAssets: 312, openRepairs: 7, breakdowns: 2, amcActive: 234, amcExpiringSoon: 15, amcExpired: 12, noCoverage: 51, maintenanceSchedules: 198, openPPM: 15, overduePPM: 4 },
    { id: 4, location: 'Chennai - OMR', totalAssets: 156, openRepairs: 2, breakdowns: 0, amcActive: 118, amcExpiringSoon: 6, amcExpired: 4, noCoverage: 28, maintenanceSchedules: 89, openPPM: 5, overduePPM: 1 },
    { id: 5, location: 'Hyderabad - Gachibowli', totalAssets: 203, openRepairs: 4, breakdowns: 1, amcActive: 152, amcExpiringSoon: 9, amcExpired: 7, noCoverage: 35, maintenanceSchedules: 134, openPPM: 9, overduePPM: 3 }
  ]
};

// Data transformation utilities
const DataUtils = {
  // Calculate totals from location data
  calculateTotals: (locations) => {
    return locations.reduce((totals, location) => ({
      totalAssets: totals.totalAssets + location.totalAssets,
      openRepairs: totals.openRepairs + location.openRepairs,
      breakdowns: totals.breakdowns + location.breakdowns,
      amcActive: totals.amcActive + location.amcActive,
      amcExpiringSoon: totals.amcExpiringSoon + location.amcExpiringSoon,
      amcExpired: totals.amcExpired + location.amcExpired,
      noCoverage: totals.noCoverage + location.noCoverage,
      maintenanceSchedules: totals.maintenanceSchedules + location.maintenanceSchedules,
      openPPM: totals.openPPM + location.openPPM,
      overduePPM: totals.overduePPM + location.overduePPM
    }), {
      totalAssets: 0, openRepairs: 0, breakdowns: 0, amcActive: 0,
      amcExpiringSoon: 0, amcExpired: 0, noCoverage: 0,
      maintenanceSchedules: 0, openPPM: 0, overduePPM: 0
    });
  },
  
  // Filter locations by search term
  filterLocations: (locations, searchTerm) => {
    if (!searchTerm) return locations;
    return locations.filter(location => 
      location.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  },
  
  // Get category data for location
  getCategoryData: (locationId) => {
    return MOCK_DATA.categoryData[locationId] || [];
  }
};



const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [expandedLocations, setExpandedLocations] = useState([]);
  const { scrollContainerRef } = useScrollManagement('dashboard');
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ location: null, category: null });
  
  // Dashboard data - using mock data for now
  const dashboardData = {
    globalKPIs: MOCK_DATA.globalKPIs,
    locationSummary: MOCK_DATA.locationSummary,
    categoryData: MOCK_DATA.categoryData
  };

  // Toggle row expansion
  const toggleRowExpansion = useCallback((locationId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  }, []);

  // Handle location toggle for dashboard table
  const handleLocationToggle = useCallback((locationId) => {
    setExpandedLocations(prev => {
      if (prev.includes(locationId)) {
        return prev.filter(id => id !== locationId);
      } else {
        return [...prev, locationId];
      }
    });
  }, []);

  const repairsSummary = {
    total: 21,
    critical: 5,
    open: 15,
    inProgress: 4,
    completed: 2
  };

  const ppmSummary = {
    total: 156,
    completed: 142,
    pending: 12,
    overdue: 2
  };

  const amcSummary = {
    total: 89,
    renewalsActive: 67,
    renewalsExpiring: 12,
    renewalsExpired: 10,
    renewalsPending: 98
  };

  // Optimized fetch function with useCallback
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await assetsAPI.getAssets();
      setAssets(response.data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching assets:', error);
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Filter locations based on search term
  const filteredLocations = useMemo(() => {
    if (!searchTerm) {
      return MOCK_DATA.locationSummary.filter(location => {
        const matchesLocation = !filters.location || location.location === filters.location;
        const matchesCategory = !filters.category || location.category === filters.category;
        return matchesLocation && matchesCategory;
      });
    }
    
    return MOCK_DATA.locationSummary.filter(location => {
      const matchesSearch = location.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = !filters.location || location.location === filters.location;
      const matchesCategory = !filters.category || location.category === filters.category;
      return matchesSearch && matchesLocation && matchesCategory;
    });
  }, [searchTerm, filters]);

  // Calculate totals for the summary row
  const totals = useMemo(() => {
    return filteredLocations.reduce((acc, location) => {
      acc.totalAssets += location.totalAssets;
      acc.openRepairs += location.openRepairs;
      acc.breakdowns += location.breakdowns;
      acc.amcActive += location.amcActive;
      acc.amcExpiringSoon += location.amcExpiringSoon;
      acc.amcExpired += location.amcExpired;
      acc.noCoverage += location.noCoverage;
      acc.ppmOpen += location.ppmOpen;
      acc.ppmOverdue += location.ppmOverdue;
      return acc;
    }, {
      totalAssets: 0,
      openRepairs: 0,
      breakdowns: 0,
      amcActive: 0,
      amcExpiringSoon: 0,
      amcExpired: 0,
      noCoverage: 0,
      ppmOpen: 0,
      ppmOverdue: 0
    });
  }, [filteredLocations]);

  // Optimized drill-down navigation functions with useCallback
  const handleAssetClick = useCallback((location, category = null) => {
    const params = new URLSearchParams({ location });
    if (category) params.append('category', category);
    navigate(`/assets?${params.toString()}`);
  }, [navigate]);

  const handleRepairClick = useCallback((location, category = null, status = 'open') => {
    const params = new URLSearchParams({ location, status });
    if (category) params.append('category', category);
    navigate(`/repairs?${params.toString()}`);
  }, [navigate]);

  const handlePPMClick = useCallback((location, category = null, status = 'open') => {
    const params = new URLSearchParams({ location, view: status });
    if (category) params.append('category', category);
    navigate(`/maintenance?${params.toString()}`);
  }, [navigate]);

  const handleAMCClick = useCallback((location, category = null, status = 'active') => {
    const params = new URLSearchParams({ location, status });
    if (category) params.append('category', category);
    navigate(`/assets?${params.toString()}`);
  }, [navigate]);

  if (loading) {
    return (
      <div className="dashboard-loading-screen">
        <div className="dashboard-loading">
          <div className="dashboard-loading-spinner"></div>
          <p className="dashboard-loading-text">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Asset Management Dashboard</h1>
        <p className="dashboard-subtitle">Comprehensive overview of your asset lifecycle management</p>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-kpi-grid">
        {KPI_CONFIG.map((kpi) => (
          <KPICard
            key={kpi.key}
            title={kpi.title}
            subtitle={kpi.subtitle}
            data={kpi.getValue(dashboardData.globalKPIs)}
            icon={kpi.icon}
            color={kpi.color}
            onClick={() => navigate(kpi.route)}
          />
        ))}
      </div>

      {/* Search and Filter Section */}
      <div className="dashboard-search-section">
        <div className="dashboard-search-header">
          <h2 className="dashboard-search-title">Location Summary</h2>
          <div className="dashboard-search-controls">
            <div className="dashboard-search-input-wrapper">
              <Search className="dashboard-search-icon" />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="dashboard-search-input"
              />
            </div>
            <button className="dashboard-action-button">
              <Filter className="dashboard-action-button-icon" />
              Filter
            </button>
            <button className="dashboard-action-button">
              <Download className="dashboard-action-button-icon" />
              Export
            </button>
          </div>
        </div>

        {/* Location Summary Table */}
        <div className="dashboard-table-container">
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                {/* Column Group Headers */}
                <tr className="dashboard-table-group-header">
                  <th className="dashboard-table-header dashboard-table-group-cell" rowSpan="2">Location</th>
                  <th className="dashboard-table-header dashboard-table-group-cell" rowSpan="2">Assets</th>
                  <th className="dashboard-table-header dashboard-table-group-cell" colSpan="2">Repairs</th>
                  <th className="dashboard-table-header dashboard-table-group-cell" colSpan="4">Coverage (AMC)</th>
                  <th className="dashboard-table-header dashboard-table-group-cell" colSpan="2">PPM Tasks</th>
                </tr>
                {/* Column Sub-Headers */}
                <tr className="dashboard-table-sub-header">
                  <th className="dashboard-table-header dashboard-table-sub-cell">Open</th>
                  <th className="dashboard-table-header dashboard-table-sub-cell">Breakdowns</th>
                  <th className="dashboard-table-header dashboard-table-sub-cell">Active</th>
                  <th className="dashboard-table-header dashboard-table-sub-cell">Expiring</th>
                  <th className="dashboard-table-header dashboard-table-sub-cell">Expired</th>
                  <th className="dashboard-table-header dashboard-table-sub-cell">No Coverage</th>
                  <th className="dashboard-table-header dashboard-table-sub-cell">Open</th>
                  <th className="dashboard-table-header dashboard-table-sub-cell">Overdue</th>
                </tr>
                {/* Total Row */}
                <tr className="dashboard-table-total-row">
                  <td className="dashboard-table-cell dashboard-table-total-cell">
                    <strong>TOTAL</strong>
                  </td>
                  <td className="dashboard-table-cell dashboard-table-total-cell">
                    <strong>{totals.totalAssets}</strong>
                  </td>
                  <td className="dashboard-table-cell dashboard-table-total-cell">
                    <strong>{totals.openRepairs}</strong>
                  </td>
                  <td className="dashboard-table-cell dashboard-table-total-cell">
                    <strong>{totals.breakdowns}</strong>
                  </td>
                  <td className="dashboard-table-cell dashboard-table-total-cell">
                    <strong>{totals.amcActive}</strong>
                  </td>
                  <td className="dashboard-table-cell dashboard-table-total-cell">
                    <strong>{totals.amcExpiringSoon}</strong>
                  </td>
                  <td className="dashboard-table-cell dashboard-table-total-cell">
                    <strong>{totals.amcExpired}</strong>
                  </td>
                  <td className="dashboard-table-cell dashboard-table-total-cell">
                    <strong>{totals.noCoverage}</strong>
                  </td>
                  <td className="dashboard-table-cell dashboard-table-total-cell">
                    <strong>{totals.ppmOpen}</strong>
                  </td>
                  <td className="dashboard-table-cell dashboard-table-total-cell">
                    <strong>{totals.ppmOverdue}</strong>
                  </td>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((location) => (
                  <React.Fragment key={location.id}>
                    <tr 
                      className={`dashboard-location-row ${
                        expandedLocations.includes(location.id) ? 'dashboard-expanded-row' : ''
                      }`}
                      onClick={() => handleLocationToggle(location.id)}
                    >
                      <td className="dashboard-table-cell dashboard-table-cell-border">
                        <div className="dashboard-location-name">
                          {location.location}
                          {expandedLocations.includes(location.id) ? (
                            <ChevronUp className="dashboard-location-icon" />
                          ) : (
                            <ChevronDown className="dashboard-location-icon" />
                          )}
                        </div>
                      </td>
                      <td className="dashboard-table-cell dashboard-table-cell-border">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssetClick(location.location);
                          }}
                          className="dashboard-cell-button dashboard-cell-button-blue"
                        >
                          {location.totalAssets}
                        </button>
                      </td>
                      <td className="dashboard-table-cell dashboard-table-cell-border">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRepairClick(location.location, 'open');
                          }}
                          className={`dashboard-cell-button ${
                            location.openRepairs > 0 ? 'dashboard-cell-button-orange' : 'dashboard-cell-button-default'
                          }`}
                        >
                          {location.openRepairs}
                        </button>
                      </td>
                      <td className="dashboard-table-cell dashboard-table-cell-border">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRepairClick(location.location, 'breakdown');
                          }}
                          className={`dashboard-cell-button ${
                            location.breakdowns > 0 ? 'dashboard-cell-button-red' : 'dashboard-cell-button-default'
                          }`}
                        >
                          {location.breakdowns}
                        </button>
                      </td>
                      <td className="dashboard-table-cell dashboard-table-cell-border">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAMCClick(location.location, 'active');
                          }}
                          className="dashboard-cell-button dashboard-cell-button-green"
                        >
                          {location.amcActive}
                        </button>
                      </td>
                      <td className="dashboard-table-cell dashboard-table-cell-border">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAMCClick(location.location, 'expiring_soon');
                          }}
                          className={`dashboard-cell-button ${
                            location.amcExpiringSoon > 0 ? 'dashboard-cell-button-orange' : 'dashboard-cell-button-default'
                          }`}
                        >
                          {location.amcExpiringSoon}
                        </button>
                      </td>
                      <td className="dashboard-table-cell dashboard-table-cell-border">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAMCClick(location.location, 'expired');
                          }}
                          className={`dashboard-cell-button ${
                            location.amcExpired > 0 ? 'dashboard-cell-button-red' : 'dashboard-cell-button-default'
                          }`}
                        >
                          {location.amcExpired}
                        </button>
                      </td>
                      <td className="dashboard-table-cell dashboard-table-cell-border">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAMCClick(location.location, 'no_coverage');
                          }}
                          className={`dashboard-cell-button ${
                            location.noCoverage > 0 ? 'dashboard-cell-button-gray' : 'dashboard-cell-button-default'
                          }`}
                        >
                          {location.noCoverage}
                        </button>
                      </td>
                      <td className="dashboard-table-cell dashboard-table-cell-border">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePPMClick(location.location, 'open');
                          }}
                          className={`dashboard-cell-button ${
                            location.openPPM > 0 ? 'dashboard-cell-button-blue' : 'dashboard-cell-button-default'
                          }`}
                        >
                          {location.openPPM}
                        </button>
                      </td>
                      <td className="dashboard-table-cell">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePPMClick(location.location, 'overdue');
                          }}
                          className={`dashboard-cell-button ${
                            location.overduePPM > 0 ? 'dashboard-cell-button-red' : 'dashboard-cell-button-default'
                          }`}
                        >
                          {location.overduePPM}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Category Breakdown */}
                    {expandedLocations.includes(location.id) && (
                      DataUtils.getCategoryData(location.id).map((category, index) => (
                        <tr key={`${location.id}-${index}`} className="dashboard-category-row">
                          <td className="dashboard-table-cell dashboard-table-cell-border">
                            <div className="dashboard-category-name">{category.category}</div>
                          </td>
                          <td className="dashboard-table-cell dashboard-table-cell-border">
                            <button 
                              onClick={() => handleAssetClick(location.location, category.category)}
                              className="dashboard-cell-button dashboard-cell-button-blue"
                            >
                              {category.totalAssets}
                            </button>
                          </td>
                          <td className="dashboard-table-cell dashboard-table-cell-border">
                            <button 
                              onClick={() => handleRepairClick(location.location, category.category, 'open')}
                              className={`dashboard-cell-button ${
                                category.openRepairs > 0 ? 'dashboard-cell-button-orange' : 'dashboard-cell-button-default'
                              }`}
                            >
                              {category.openRepairs}
                            </button>
                          </td>
                          <td className="dashboard-table-cell dashboard-table-cell-border">
                            <button 
                              onClick={() => handleRepairClick(location.location, category.category, 'breakdown')}
                              className={`dashboard-cell-button ${
                                category.breakdowns > 0 ? 'dashboard-cell-button-red' : 'dashboard-cell-button-default'
                              }`}
                            >
                              {category.breakdowns}
                            </button>
                          </td>
                          <td className="dashboard-table-cell dashboard-table-cell-border">
                            <button 
                              onClick={() => handleAMCClick(location.location, category.category, 'active')}
                              className="dashboard-cell-button dashboard-cell-button-green"
                            >
                              {category.active}
                            </button>
                          </td>
                          <td className="dashboard-table-cell dashboard-table-cell-border">
                            <button 
                              onClick={() => handleAMCClick(location.location, category.category, 'expiring_soon')}
                              className={`dashboard-cell-button ${
                                category.expiring > 0 ? 'dashboard-cell-button-orange' : 'dashboard-cell-button-default'
                              }`}
                            >
                              {category.expiring}
                            </button>
                          </td>
                          <td className="dashboard-table-cell dashboard-table-cell-border">
                            <button 
                              onClick={() => handleAMCClick(location.location, category.category, 'expired')}
                              className={`dashboard-cell-button ${
                                category.expired > 0 ? 'dashboard-cell-button-red' : 'dashboard-cell-button-default'
                              }`}
                            >
                              {category.expired}
                            </button>
                          </td>
                          <td className="dashboard-table-cell dashboard-table-cell-border">
                            <button 
                              onClick={() => handleAMCClick(location.location, category.category, 'no_coverage')}
                              className={`dashboard-cell-button ${
                                category.noCoverage > 0 ? 'dashboard-cell-button-gray' : 'dashboard-cell-button-default'
                              }`}
                            >
                              {category.noCoverage}
                            </button>
                          </td>
                          <td className="dashboard-table-cell dashboard-table-cell-border">
                            <button 
                              onClick={() => handlePPMClick(location.location, category.category, 'open')}
                              className={`dashboard-cell-button ${
                                category.openTasks > 0 ? 'dashboard-cell-button-blue' : 'dashboard-cell-button-default'
                              }`}
                            >
                              {category.openTasks}
                            </button>
                          </td>
                          <td className="dashboard-table-cell">
                            <button 
                              onClick={() => handlePPMClick(location.location, category.category, 'overdue')}
                              className={`dashboard-cell-button ${
                                category.overdue > 0 ? 'dashboard-cell-button-red' : 'dashboard-cell-button-default'
                              }`}
                            >
                              {category.overdue}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
