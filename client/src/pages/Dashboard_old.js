import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  Wrench, 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw,
  Plus,
  Activity,
  Calendar,
  BarChart3,
  Users,
  Clock
} from 'lucide-react';
import { dashboardAPI } from '../utils/api';
import { assetLifecycleAPI } from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';

// Professional Asset KPI Card Component - Carbon Design System Inspired
const AssetKPICard = ({ title, value, icon: Icon, trend, trendDirection, color = 'primary', link }) => {
  const cardContent = (
    <div 
      className="p-6 border rounded-none transition-all duration-200 hover:shadow-lg cursor-pointer"
      style={{
        backgroundColor: 'var(--color-layer-01)',
        borderColor: 'var(--color-border-subtle)',
        boxShadow: 'var(--shadow-01)'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {title}
          </p>
          <p className="text-3xl font-light mt-2" style={{ 
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-heading-04)'
          }}>
            {value}
          </p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${
              trendDirection === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-4 h-4 mr-1 ${
                trendDirection === 'down' ? 'rotate-180' : ''
              }`} />
              {trend}
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg" style={{
          backgroundColor: color === 'success' ? 'var(--color-green-10)' : 
                          color === 'warning' ? 'var(--color-yellow-10)' : 
                          'var(--color-blue-10)'
        }}>
          <Icon className="w-6 h-6" style={{
            color: color === 'success' ? 'var(--color-green-60)' : 
                   color === 'warning' ? 'var(--color-yellow-60)' : 
                   'var(--color-blue-60)'
          }} />
        </div>
      </div>
    </div>
  );

  return link ? <Link to={link}>{cardContent}</Link> : cardContent;
};

// Maintenance Status Row Component
const MaintenanceStatusRow = ({ label, total, completed, pending }) => {
  const completionRate = total > 0 ? (completed / total) * 100 : 0;
  
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--color-border-subtle)' }}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {completed}/{total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${completionRate}%`,
              backgroundColor: completionRate >= 80 ? 'var(--color-green-60)' : 
                              completionRate >= 60 ? 'var(--color-yellow-60)' : 
                              'var(--color-red-60)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Performance Metric Component
const PerformanceMetric = ({ label, value, target, unit }) => {
  const percentage = (value / target) * 100;
  const isOnTarget = percentage >= 95;
  
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{label}</span>
          <span className={`text-sm font-medium ${
            isOnTarget ? 'text-green-600' : 'text-yellow-600'
          }`}>
            {value}{unit} / {target}{unit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: isOnTarget ? 'var(--color-green-60)' : 'var(--color-yellow-60)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Critical Asset Item Component
const CriticalAssetItem = ({ asset }) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded" style={{
      backgroundColor: 'var(--color-red-10)',
      borderColor: 'var(--color-red-30)'
    }}>
      <div className="flex items-center">
        <AlertTriangle className="w-5 h-5 text-red-600 mr-3" />
        <div>
          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {asset.assetName || asset.ticketNumber || 'Asset'}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {asset.location || asset.locationShortCode} • {asset.category}
          </p>
        </div>
      </div>
      <span className="text-xs px-2 py-1 rounded" style={{
        backgroundColor: 'var(--color-red-60)',
        color: 'var(--color-text-inverse)'
      }}>
        {asset.status || 'Critical'}
      </span>
    </div>
  );
};

// Upcoming Maintenance Item Component
const UpcomingMaintenanceItem = ({ maintenance }) => {
  return (
    <div className="flex items-center justify-between p-3 border rounded" style={{
      backgroundColor: 'var(--color-layer-01)',
      borderColor: 'var(--color-border-subtle)'
    }}>
      <div className="flex items-center">
        <Calendar className="w-5 h-5 mr-3" style={{ color: 'var(--color-blue-60)' }} />
        <div>
          <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {maintenance.subject || maintenance.maintenanceName || 'Maintenance Task'}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {maintenance.location || maintenance.locationShortCode} • {maintenance.category}
          </p>
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs px-2 py-1 rounded" style={{
          backgroundColor: 'var(--color-blue-10)',
          color: 'var(--color-blue-60)'
        }}>
          {maintenance.scheduledDate || 'Scheduled'}
        </span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [assetData, setAssetData] = useState(null);
  const [lifecycleData, setLifecycleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollContainerRef = useRef(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const [assetResponse, lifecycleResponse] = await Promise.allSettled([
        dashboardAPI.getOverview(),
        assetLifecycleAPI.getAssetDashboardData()
      ]);

      if (assetResponse.status === 'fulfilled') {
        setAssetData(assetResponse.value);
      } else {
        console.error('Asset data fetch failed:', assetResponse.reason);
      }

      if (lifecycleResponse.status === 'fulfilled') {
        setLifecycleData(lifecycleResponse.value);
      } else {
        console.error('Lifecycle data fetch failed:', lifecycleResponse.reason);
      }

      if (assetResponse.status === 'rejected' && lifecycleResponse.status === 'rejected') {
        setError('Failed to load dashboard data. Please try again.');
      }
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  // Prepare KPI data
  const kpiData = [
    {
      title: 'Total Assets',
      value: assetData?.totalAssets || '0',
      icon: Building2,
      color: 'primary',
      trend: '+12%',
      trendDirection: 'up',
      link: '/assets'
    },
    {
      title: 'Active Operations',
      value: lifecycleData?.activeOperations || '0',
      icon: Activity,
      color: 'success',
      trend: '+5%',
      trendDirection: 'up'
    },
    {
      title: 'Health Score',
      value: `${lifecycleData?.healthScore || '95'}%`,
      icon: BarChart3,
      color: 'success',
      trend: '+2%',
      trendDirection: 'up'
    },
    {
      title: 'Critical Issues',
      value: lifecycleData?.criticalIssues || '3',
      icon: AlertTriangle,
      color: 'warning',
      trend: '-1',
      trendDirection: 'down'
    }
  ];

  // Prepare maintenance activities data
  const maintenanceActivities = [
    {
      label: 'PPM Tasks',
      total: lifecycleData?.ppmTasks?.total || 0,
      completed: lifecycleData?.ppmTasks?.completed || 0,
      pending: lifecycleData?.ppmTasks?.pending || 0
    },
    {
      label: 'AMC Renewals',
      total: lifecycleData?.amcRenewals?.total || 0,
      completed: lifecycleData?.amcRenewals?.completed || 0,
      pending: lifecycleData?.amcRenewals?.pending || 0
    },
    {
      label: 'Repairs',
      total: lifecycleData?.repairs?.total || 0,
      completed: lifecycleData?.repairs?.completed || 0,
      pending: lifecycleData?.repairs?.pending || 0
    }
  ];

  // Prepare performance metrics
  const performanceMetrics = [
    {
      label: 'Uptime',
      value: lifecycleData?.uptime?.current || 98.5,
      target: 99.0,
      unit: '%'
    },
    {
      label: 'Response Time',
      value: lifecycleData?.responseTime?.current || 2.3,
      target: 4.0,
      unit: 'h'
    },
    {
      label: 'Compliance',
      value: lifecycleData?.compliance?.current || 96,
      target: 95,
      unit: '%'
    }
  ];

  // Sample critical assets and upcoming maintenance
  const criticalAssets = lifecycleData?.criticalAssets || [
    { assetName: 'HVAC Unit A1', location: 'Building A', category: 'HVAC', status: 'Critical' },
    { assetName: 'Generator B2', location: 'Building B', category: 'Power', status: 'Warning' },
    { assetName: 'Elevator C3', location: 'Building C', category: 'Vertical Transport', status: 'Critical' }
  ];

  const upcomingMaintenance = lifecycleData?.upcomingMaintenance || [
    { maintenanceName: 'HVAC Filter Replacement', location: 'Building A', category: 'HVAC', scheduledDate: 'Today' },
    { maintenanceName: 'Generator Service', location: 'Building B', category: 'Power', scheduledDate: 'Tomorrow' },
    { maintenanceName: 'Fire System Check', location: 'Building C', category: 'Safety', scheduledDate: '2 days' }
  ];

  if (loading) return <LoadingSpinner />;

  if (error && !assetData && !lifecycleData) {
    return <div className="text-center text-red-600 py-8">{error}</div>;
  }

  return (
    <div ref={scrollContainerRef} className="min-h-screen" style={{backgroundColor: 'var(--color-background)', color: 'var(--color-text-primary)'}}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light mb-2" style={{ 
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-heading-05)'
            }}>
              Asset Management Dashboard
            </h1>
            <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
              Comprehensive overview of asset lifecycle and maintenance operations
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-secondary flex items-center gap-2"
              style={{
                backgroundColor: 'var(--color-layer-01)',
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-text-primary)'
              }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link to="/assets/manage" className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Asset
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiData.map((kpi, index) => (
          <AssetKPICard key={index} {...kpi} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Maintenance Activities */}
        <div className="lg:col-span-2">
          <div className="p-6 border rounded-none" style={{
            backgroundColor: 'var(--color-layer-01)',
            borderColor: 'var(--color-border-subtle)'
          }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Maintenance Activities
              </h2>
              <Link to="/maintenance/ppm" className="text-sm" style={{ color: 'var(--color-link-primary)' }}>
                View all →
              </Link>
            </div>
            <div className="space-y-4">
              {maintenanceActivities.map((activity, index) => (
                <MaintenanceStatusRow key={index} {...activity} />
              ))}
            </div>
          </div>

          {/* Asset Performance */}
          <div className="mt-6 p-6 border rounded-none" style={{
            backgroundColor: 'var(--color-layer-01)',
            borderColor: 'var(--color-border-subtle)'
          }}>
            <h2 className="text-xl font-medium mb-6" style={{ color: 'var(--color-text-primary)' }}>
              Asset Performance
            </h2>
            <div className="space-y-4">
              {performanceMetrics.map((metric, index) => (
                <PerformanceMetric key={index} {...metric} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Critical Assets */}
          <div className="p-6 border rounded-none" style={{
            backgroundColor: 'var(--color-layer-01)',
            borderColor: 'var(--color-border-subtle)'
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Critical Assets
              </h2>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div className="space-y-3">
              {criticalAssets.slice(0, 3).map((asset, index) => (
                <CriticalAssetItem key={index} asset={asset} />
              ))}
            </div>
            {criticalAssets.length > 3 && (
              <div className="mt-4 text-center">
                <Link to="/assets" className="text-sm" style={{ color: 'var(--color-link-primary)' }}>
                  View all {criticalAssets.length} critical assets →
                </Link>
              </div>
            )}
          </div>

          {/* Upcoming Maintenance */}
          <div className="p-6 border rounded-none" style={{
            backgroundColor: 'var(--color-layer-01)',
            borderColor: 'var(--color-border-subtle)'
          }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Upcoming Maintenance
              </h2>
              <Calendar className="w-5 h-5" style={{ color: 'var(--color-blue-60)' }} />
            </div>
            <div className="space-y-3">
              {upcomingMaintenance.slice(0, 3).map((maintenance, index) => (
                <UpcomingMaintenanceItem key={index} maintenance={maintenance} />
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link to="/maintenance/schedules" className="text-sm" style={{ color: 'var(--color-link-primary)' }}>
                View all schedules →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
