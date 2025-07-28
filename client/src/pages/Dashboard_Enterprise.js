import React, { useState, useEffect, useRef } from 'react';
import { dashboardAPI } from '../utils/api';
import { RefreshCw, Plus, Building2, Wrench, AlertTriangle, Clock, CheckCircle, Activity, Zap, TrendingUp, Search, Filter, Download, MoreVertical } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const [locationData, setLocationData] = useState([]);
  const [summaryData, setSummaryData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollContainerRef = useRef(null);

  // Static data for demonstration - will be replaced with API calls
  const staticLocationData = [
    {
      location: 'Mumbai - BKC',
      total_assets: 145,
      open_repairs: 12,
      breakdowns: 3,
      active_amc: 89,
      expiring_soon: 8,
      expired: 2,
      no_coverage: 15,
      maintenance_schedules: 142,
      open_ppm_tasks: 25,
      overdue_ppm_tasks: 4
    },
    {
      location: 'Delhi - CP',
      total_assets: 128,
      open_repairs: 8,
      breakdowns: 1,
      active_amc: 76,
      expiring_soon: 12,
      expired: 5,
      no_coverage: 22,
      maintenance_schedules: 125,
      open_ppm_tasks: 18,
      overdue_ppm_tasks: 7
    },
    {
      location: 'Bangalore - Whitefield',
      total_assets: 167,
      open_repairs: 15,
      breakdowns: 2,
      active_amc: 98,
      expiring_soon: 6,
      expired: 3,
      no_coverage: 18,
      maintenance_schedules: 164,
      open_ppm_tasks: 32,
      overdue_ppm_tasks: 5
    },
    {
      location: 'Chennai - OMR',
      total_assets: 112,
      open_repairs: 6,
      breakdowns: 0,
      active_amc: 67,
      expiring_soon: 9,
      expired: 1,
      no_coverage: 25,
      maintenance_schedules: 108,
      open_ppm_tasks: 21,
      overdue_ppm_tasks: 3
    },
    {
      location: 'Hyderabad - Gachibowli',
      total_assets: 134,
      open_repairs: 10,
      breakdowns: 1,
      active_amc: 82,
      expiring_soon: 7,
      expired: 4,
      no_coverage: 19,
      maintenance_schedules: 131,
      open_ppm_tasks: 28,
      overdue_ppm_tasks: 6
    }
  ];

  const staticSummaryData = {
    repairs: {
      totalTickets: 1247,
      openTickets: 51,
      criticalTickets: 7,
      closedTickets: 1189
    },
    ppm: {
      totalTasks: 3200,
      openTasks: 124,
      overdueTasks: 25,
      completedTasks: 3051
    },
    amc: {
      totalRenewals: 412,
      activeRenewals: 412,
      expiringRenewals: 42,
      expiredRenewals: 15
    }
  };

  const fetchDashboardData = async () => {
    try {
      setError(null);
      // For now, using static data
      setLocationData(staticLocationData);
      setSummaryData(staticSummaryData);
    } catch (error) {
      console.error('Dashboard data fetch error:', error);
      setError('An unexpected error occurred while loading the dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Global KPI Card Component
  const GlobalKPICard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Icon className={`w-5 h-5 text-${color}-600`} />
            <p className="text-sm font-medium text-gray-600">{title}</p>
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        {trend && (
          <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            trend.type === 'up' ? 'bg-green-100 text-green-700' : 
            trend.type === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {trend.type === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : null}
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) return <LoadingSpinner />;
  if (error) {
    return <div className="text-center text-red-600 py-8">{error}</div>;
  }

  const filteredData = locationData.filter(location => 
    location.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={scrollContainerRef} className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Enterprise Asset Dashboard</h1>
            <p className="text-sm text-gray-600 mt-2">Comprehensive multi-location asset lifecycle management and operational intelligence</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Global KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlobalKPICard
            title="Total Assets"
            value="686"
            subtitle="Across all locations"
            icon={Building2}
            color="blue"
            trend={{ type: 'up', value: '+12 this month' }}
          />
          <GlobalKPICard
            title="Active Repairs"
            value={summaryData.repairs?.openTickets || "51"}
            subtitle={`${summaryData.repairs?.criticalTickets || 7} critical`}
            icon={Wrench}
            color="orange"
            trend={{ type: 'down', value: '-8 from last week' }}
          />
          <GlobalKPICard
            title="PPM Compliance"
            value="92.2%"
            subtitle={`${summaryData.ppm?.overdueTasks || 25} overdue tasks`}
            icon={CheckCircle}
            color="green"
            trend={{ type: 'up', value: '+2.1% this month' }}
          />
          <GlobalKPICard
            title="AMC Coverage"
            value="89.4%"
            subtitle={`${summaryData.amc?.expiringRenewals || 42} expiring soon`}
            icon={Activity}
            color="purple"
            trend={{ type: 'stable', value: 'No change' }}
          />
        </div>

        {/* Multi-Location Summary Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Multi-Location Asset Summary</h2>
                <p className="text-sm text-gray-600 mt-1">Comprehensive overview across all {locationData.length} locations</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </button>
                <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                    Location
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[100px]">
                    Total Assets
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-orange-600 uppercase tracking-wider border-l border-gray-200 min-w-[100px]">
                    Open Repairs
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-red-600 uppercase tracking-wider min-w-[100px]">
                    Breakdowns
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-green-600 uppercase tracking-wider border-l border-gray-200 min-w-[100px]">
                    Active AMC
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-yellow-600 uppercase tracking-wider min-w-[110px]">
                    Expiring Soon
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-red-600 uppercase tracking-wider min-w-[80px]">
                    Expired
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[110px]">
                    No Coverage
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-blue-600 uppercase tracking-wider border-l border-gray-200 min-w-[100px]">
                    Schedules
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-blue-600 uppercase tracking-wider border-l border-gray-200 min-w-[100px]">
                    Open PPM
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-red-600 uppercase tracking-wider min-w-[110px]">
                    Overdue PPM
                  </th>
                  <th className="px-4 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[80px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((location, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                      <div className="flex items-center">
                        <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{location.location}</div>
                          <div className="text-xs text-gray-500">ID: LOC-{String(index + 1).padStart(3, '0')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-gray-900">{location.total_assets}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        location.open_repairs > 10 ? 'bg-red-100 text-red-800' : 
                        location.open_repairs > 5 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {location.open_repairs}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        location.breakdowns > 2 ? 'bg-red-100 text-red-800' : 
                        location.breakdowns > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {location.breakdowns}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-green-600">{location.active_amc}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        location.expiring_soon > 10 ? 'bg-red-100 text-red-800' : 
                        location.expiring_soon > 5 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {location.expiring_soon}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        location.expired > 3 ? 'bg-red-100 text-red-800' : 
                        location.expired > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {location.expired}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-600">{location.no_coverage}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-blue-600">{location.maintenance_schedules}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        location.open_ppm_tasks > 25 ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {location.open_ppm_tasks}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        location.overdue_ppm_tasks > 5 ? 'bg-red-100 text-red-800' : 
                        location.overdue_ppm_tasks > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {location.overdue_ppm_tasks}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Individual Module Summaries */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Repairs Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Wrench className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Repairs & Maintenance</h3>
                  <p className="text-sm text-gray-500">Active repair tickets</p>
                </div>
              </div>
              <a href="/repairs" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </a>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Tickets</span>
                <span className="text-lg font-bold text-gray-900">{summaryData.repairs?.totalTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Open</span>
                <span className="text-lg font-semibold text-orange-600">{summaryData.repairs?.openTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Critical</span>
                <span className="text-lg font-semibold text-red-600">{summaryData.repairs?.criticalTickets}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Resolved</span>
                <span className="text-lg font-semibold text-green-600">{summaryData.repairs?.closedTickets}</span>
              </div>
            </div>
          </div>

          {/* PPM Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">PPM Tasks</h3>
                  <p className="text-sm text-gray-500">Preventive maintenance</p>
                </div>
              </div>
              <a href="/ppm-tasks" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </a>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Tasks</span>
                <span className="text-lg font-bold text-gray-900">{summaryData.ppm?.totalTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Open</span>
                <span className="text-lg font-semibold text-blue-600">{summaryData.ppm?.openTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overdue</span>
                <span className="text-lg font-semibold text-red-600">{summaryData.ppm?.overdueTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="text-lg font-semibold text-green-600">{summaryData.ppm?.completedTasks}</span>
              </div>
            </div>
          </div>

          {/* AMC Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">AMC Renewals</h3>
                  <p className="text-sm text-gray-500">Contract management</p>
                </div>
              </div>
              <a href="/amc-renewals" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All →
              </a>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Contracts</span>
                <span className="text-lg font-bold text-gray-900">{summaryData.amc?.totalRenewals}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <span className="text-lg font-semibold text-green-600">{summaryData.amc?.activeRenewals}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expiring Soon</span>
                <span className="text-lg font-semibold text-yellow-600">{summaryData.amc?.expiringRenewals}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expired</span>
                <span className="text-lg font-semibold text-red-600">{summaryData.amc?.expiredRenewals}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
