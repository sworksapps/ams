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

// Enhanced Constants Configuration
const DASHBOARD_CONFIG = {
  REFRESH_INTERVAL: 30000, // 30 seconds
  SEARCH_DEBOUNCE: 300, // milliseconds
  MAX_LOCATIONS_DISPLAY: 50,
  DEFAULT_PAGE_SIZE: 10
};

const KPI_COLORS = {
  blue: 'border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100',
  green: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100',
  orange: 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100',
  red: 'border-red-200 bg-gradient-to-br from-red-50 to-red-100'
};

const UI_CLASSES = {
  cellHover: 'hover:text-blue-600 hover:underline cursor-pointer transition-colors',
  criticalCell: {
    red: 'text-red-600 hover:text-red-700',
    orange: 'text-orange-600 hover:text-orange-700',
    green: 'text-green-600 hover:text-green-700',
    gray: 'text-gray-600 hover:text-gray-700'
  },
  tableHeader: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50',
  tableCell: 'px-4 py-3 whitespace-nowrap text-sm',
  expandedRow: 'bg-blue-50/30'
};

// Navigation Routes Configuration
const NAVIGATION_ROUTES = {
  ASSETS: '/assets',
  REPAIRS: '/repairs',
  PPM_TASKS: '/maintenance/tasks',
  AMC_RENEWALS: '/amc-renewals',
  COVERAGE: '/coverage'
};

// KPI Configuration
const KPI_CONFIG = [
  {
    key: 'totalAssets',
    title: 'Total Assets',
    icon: Package,
    color: 'blue',
    getValue: (data) => data.totalAssets || 0,
    route: NAVIGATION_ROUTES.ASSETS
  },
  {
    key: 'activeRepairs',
    title: 'Active Repairs',
    icon: Wrench,
    color: 'orange',
    getValue: (data) => data.activeRepairs || 0,
    route: NAVIGATION_ROUTES.REPAIRS
  },
  {
    key: 'criticalIssues',
    title: 'Critical Issues',
    icon: AlertTriangle,
    color: 'red',
    getValue: (data) => (data.breakdowns || 0) + (data.overduePPM || 0) + (data.expiredAMC || 0),
    route: NAVIGATION_ROUTES.REPAIRS
  },
  {
    key: 'ppmCompliance',
    title: 'PPM Compliance',
    icon: CheckCircle,
    color: 'green',
    getValue: (data) => `${data.ppmCompliance || 0}%`,
    route: NAVIGATION_ROUTES.PPM_TASKS
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
    totalAssets: 2847,
    activeRepairs: 23,
    ppmCompliance: 94.2,
    amcCoverage: 78.5,
    breakdowns: 5,
    overduePPM: 11,
    expiredAMC: 39
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
  },

  filterLocations: (locations, searchTerm) => {
    if (!searchTerm.trim()) return locations;
    return locations.filter(location =>
      location.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  },

  getCategoryData: (categories, limit = DASHBOARD_CONFIG.DISPLAY_LIMITS.CATEGORIES) => {
    return categories.slice(0, limit);
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Data from mock - in real app, this would come from API
  const { globalKPIs, locationSummary, categoryData } = MOCK_DATA;

  // Filtered locations based on search
  const filteredLocations = useMemo(() => {
    return DataUtils.filterLocations(locationSummary, searchTerm);
  }, [locationSummary, searchTerm]);

  // Handle refresh
  const handleRefresh = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, DASHBOARD_CONFIG.REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="mobile-container">
        <div className="mobile-loading-state">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      {/* Header */}
      <div className="mobile-header">
        <h1 className="mobile-page-title">Dashboard</h1>
        <button
          onClick={handleRefresh}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="mobile-kpi-grid">
        {KPI_CONFIG.map((kpi) => {
          const value = kpi.getValue(globalKPIs);
          const IconComponent = kpi.icon;
          
          return (
            <div
              key={kpi.key}
              className="mobile-kpi-card"
              onClick={() => navigate(kpi.route)}
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${kpi.color}`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="mobile-kpi-title">{kpi.title}</p>
                  <p className="mobile-kpi-value">{value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="mobile-card">
        <div className="mobile-padding">
          <div className="mobile-search-section">
            <div className="mobile-search-container">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mobile-input pl-10"
              />
            </div>
            <button
              onClick={() => setSearchTerm('')}
              className="mobile-button mobile-button-sm bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Location Summary */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <h2 className="mobile-card-title">Location Summary</h2>
        </div>
        <div className="mobile-padding">
          <div className="mobile-table-container">
            <table className="mobile-table">
              <thead className="mobile-table-header">
                <tr>
                  <th className="mobile-table-th">Location</th>
                  <th className="mobile-table-th">Total Assets</th>
                  <th className="mobile-table-th">Active</th>
                  <th className="mobile-table-th hide-mobile">Under Maintenance</th>
                  <th className="mobile-table-th">Critical</th>
                </tr>
              </thead>
              <tbody className="mobile-table-body">
                {filteredLocations.map((location, index) => (
                  <tr key={index} className="mobile-table-row">
                    <td className="mobile-table-td font-medium">{location.name}</td>
                    <td className="mobile-table-td">{location.totalAssets}</td>
                    <td className="mobile-table-td text-green-600">{location.active}</td>
                    <td className="mobile-table-td text-yellow-600 hide-mobile">{location.underMaintenance}</td>
                    <td className="mobile-table-td text-red-600">{location.critical}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <h2 className="mobile-card-title">Asset Categories</h2>
        </div>
        <div className="mobile-padding">
          <div className="mobile-category-grid">
            {categoryData.map((category, index) => (
              <div key={index} className="mobile-category-card">
                <h3 className="mobile-category-title">{category.name}</h3>
                <p className="mobile-category-count">{category.count}</p>
                <p className="mobile-category-label">assets</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

      {/* Search */}
      <div className="mobile-card">
        <div className="mobile-padding">
          <div className="mobile-search-section">
            <div className="mobile-search-container">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mobile-input pl-10"
              />
            </div>
            <button
              onClick={() => setSearchTerm('')}
              className="mobile-button mobile-button-sm bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mobile-card">
        <div className="mobile-padding">
          <div className="mobile-filter-section">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="mobile-select"
            >
              <option value="all">All Locations</option>
              <option value="mumbai">Mumbai</option>
              <option value="delhi">Delhi</option>
              <option value="bangalore">Bangalore</option>
              <option value="chennai">Chennai</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mobile-kpi-grid">
        {KPI_CONFIG.map((kpi) => {
          const value = kpi.getValue(globalKPIs);
          const IconComponent = kpi.icon;

          return (
            <div
              key={kpi.key}
              className="mobile-kpi-card"
              onClick={() => navigate(kpi.route)}
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 p-3 rounded-lg ${kpi.color}`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="mobile-kpi-title">{kpi.title}</p>
                  <p className="mobile-kpi-value">{value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Location Summary */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <h2 className="mobile-card-title">Location Summary</h2>
        </div>
        <div className="mobile-padding">
          <div className="mobile-table-container">
            <table className="mobile-table">
              <thead className="mobile-table-header">
                <tr>
                  <th className="mobile-table-th">Location</th>
                  <th className="mobile-table-th">Total Assets</th>
                  <th className="mobile-table-th">Active</th>
                  <th className="mobile-table-th hide-mobile">Under Maintenance</th>
                  <th className="mobile-table-th">Critical</th>
                </tr>
              </thead>
              <tbody className="mobile-table-body">
                {filteredLocations.map((location, index) => (
                  <tr key={index} className="mobile-table-row">
                    <td className="mobile-table-td font-medium">{location.name}</td>
                    <td className="mobile-table-td">{location.totalAssets}</td>
                    <td className="mobile-table-td text-green-600">{location.active}</td>
                    <td className="mobile-table-td text-yellow-600 hide-mobile">{location.underMaintenance}</td>
                    <td className="mobile-table-td text-red-600">{location.critical}</td>
                  </tr>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open Tasks</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">Overdue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiring</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expired</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No Coverage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Coverages</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Totals Row */}
                  <tr className="bg-blue-50 border-b-2 border-blue-200 font-semibold">
                    <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                      <div className="font-bold text-blue-900 text-sm">TOTALS</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                      <div className="text-sm text-blue-900 font-bold">
                        {filteredLocations.reduce((sum, loc) => sum + loc.totalAssets, 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-900 font-bold">
                        {filteredLocations.reduce((sum, loc) => sum + loc.openRepairs, 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                      <div className="text-sm text-red-700 font-bold">
                        {filteredLocations.reduce((sum, loc) => sum + loc.breakdowns, 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-900 font-bold">
                        {filteredLocations.reduce((sum, loc) => sum + loc.openPPM, 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                      <div className="text-sm text-red-700 font-bold">
                        {filteredLocations.reduce((sum, loc) => sum + loc.overduePPM, 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-green-700 font-bold">
                        {filteredLocations.reduce((sum, loc) => sum + loc.amcActive, 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-orange-700 font-bold">
                        {filteredLocations.reduce((sum, loc) => sum + loc.amcExpiringSoon, 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-red-700 font-bold">
                        {filteredLocations.reduce((sum, loc) => sum + loc.amcExpired, 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700 font-bold">
                        {filteredLocations.reduce((sum, loc) => sum + loc.noCoverage, 0)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-blue-700 font-bold">
                        {filteredLocations.reduce((sum, loc) => sum + loc.amcActive + loc.amcExpiringSoon + loc.amcExpired, 0)}
                      </div>
                    </td>
                  </tr>
                  
                  {filteredLocations.map((location) => (
                    <React.Fragment key={location.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-gray-900 text-sm">{location.location}</div>
                            <button 
                              onClick={() => toggleRowExpansion(location.id)}
                              className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50 transition-colors ml-2"
                              title={expandedRows.has(location.id) ? 'Collapse' : 'Expand'}
                            >
                              {expandedRows.has(location.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                          <button 
                            onClick={() => handleAssetClick(location.location)}
                            className="text-sm text-gray-900 font-medium hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                          >
                            {location.totalAssets}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleRepairClick(location.location, null, 'open')}
                            className="text-sm text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                          >
                            {location.openRepairs}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                          <button 
                            onClick={() => handleRepairClick(location.location, null, 'breakdown')}
                            className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${
                              location.breakdowns > 0 ? 'text-red-600 hover:text-red-700' : 'text-gray-900 hover:text-blue-600'
                            }`}
                          >
                            {location.breakdowns}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handlePPMClick(location.location, null, 'open')}
                            className="text-sm text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                          >
                            {location.openPPM}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap border-r border-gray-100">
                          <button 
                            onClick={() => handlePPMClick(location.location, null, 'overdue')}
                            className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${
                              location.overduePPM > 0 ? 'text-red-600 hover:text-red-700' : 'text-gray-900 hover:text-blue-600'
                            }`}
                          >
                            {location.overduePPM}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleAMCClick(location.location, null, 'active')}
                            className="text-sm text-green-600 font-medium hover:text-green-700 hover:underline cursor-pointer transition-colors"
                          >
                            {location.amcActive}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleAMCClick(location.location, null, 'expiring_soon')}
                            className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${
                              location.amcExpiringSoon > 0 ? 'text-orange-600 hover:text-orange-700' : 'text-gray-900 hover:text-blue-600'
                            }`}
                          >
                            {location.amcExpiringSoon}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleAMCClick(location.location, null, 'expired')}
                            className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${
                              location.amcExpired > 0 ? 'text-red-600 hover:text-red-700' : 'text-gray-900 hover:text-blue-600'
                            }`}
                          >
                            {location.amcExpired}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleAMCClick(location.location, null, 'no_coverage')}
                            className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${
                              location.noCoverage > 0 ? 'text-gray-600 hover:text-gray-700' : 'text-gray-900 hover:text-blue-600'
                            }`}
                          >
                            {location.noCoverage}
                          </button>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button 
                            onClick={() => handleAMCClick(location.location)}
                            className="text-sm text-blue-600 font-medium hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                          >
                            {location.amcActive + location.amcExpiringSoon + location.amcExpired}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Drill-down rows - expanded within same table */}
                      {expandedRows.has(location.id) && MOCK_DATA.categoryData[location.id]?.map((category, idx) => (
                        <tr key={`${location.id}-${idx}`} className="bg-blue-50 border-l-4 border-blue-200">
                          <td className="px-4 py-3 whitespace-nowrap border-r border-gray-100">
                            <div className="text-sm font-medium text-blue-800 ml-4">↳ {category.category}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border-r border-gray-100">
                            <button 
                              onClick={() => handleAssetClick(location.location, category.category)}
                              className="text-sm text-gray-700 font-medium hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                            >
                              {category.totalAssets}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button 
                              onClick={() => handleRepairClick(location.location, category.category, 'open')}
                              className="text-sm text-gray-700 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                            >
                              {category.openRepairs}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border-r border-gray-100">
                            <button 
                              onClick={() => handleRepairClick(location.location, category.category, 'breakdown')}
                              className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${
                                category.breakdowns > 0 ? 'text-red-600 hover:text-red-700' : 'text-gray-700 hover:text-blue-600'
                              }`}
                            >
                              {category.breakdowns}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button 
                              onClick={() => handlePPMClick(location.location, category.category, 'open')}
                              className="text-sm text-gray-700 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                            >
                              {category.openTasks}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap border-r border-gray-100">
                            <button 
                              onClick={() => handlePPMClick(location.location, category.category, 'overdue')}
                              className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${
                                category.overdue > 0 ? 'text-red-600 hover:text-red-700' : 'text-gray-700 hover:text-blue-600'
                              }`}
                            >
                              {category.overdue}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button 
                              onClick={() => handleAMCClick(location.location, category.category, 'active')}
                              className="text-sm text-green-600 font-medium hover:text-green-700 hover:underline cursor-pointer transition-colors"
                            >
                              {category.active}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button 
                              onClick={() => handleAMCClick(location.location, category.category, 'expiring_soon')}
                              className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${
                                category.expiring > 0 ? 'text-orange-600 hover:text-orange-700' : 'text-gray-700 hover:text-blue-600'
                              }`}
                            >
                              {category.expiring}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button 
                              onClick={() => handleAMCClick(location.location, category.category, 'expired')}
                              className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${
                                category.expired > 0 ? 'text-red-600 hover:text-red-700' : 'text-gray-700 hover:text-blue-600'
                              }`}
                            >
                              {category.expired}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button 
                              onClick={() => handleAMCClick(location.location, category.category, 'no_coverage')}
                              className={`text-sm font-medium hover:underline cursor-pointer transition-colors ${
                                category.noCoverage > 0 ? 'text-gray-600 hover:text-gray-700' : 'text-gray-700 hover:text-blue-600'
                              }`}
                            >
                              {category.noCoverage}
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button 
                              onClick={() => handleAMCClick(location.location, category.category)}
                              className="text-sm text-gray-700 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                            >
                              {category.active + category.expiring + category.expired + category.noCoverage}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default Dashboard;
