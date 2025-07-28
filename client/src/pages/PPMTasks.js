import React, { useState, useEffect, useMemo } from 'react';
import { 
  Filter, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Activity,
  Zap,
  ClipboardList,
  Wrench
} from 'lucide-react';
import { maintenanceAPI, assetsAPI } from '../utils/api';
import { useScrollManagement } from '../hooks/useScrollManagement';
import LoadingSpinner from '../components/LoadingSpinner';
import DataTable from '../components/DataTable/DataTable';
import KPICard from '../components/KPICard/KPICard';

const PPMTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 10
  });

  const [filters, setFilters] = useState({
    location: '',
    category: '',
    status: '',
    view: 'open' // Default to open tickets
  });
  const [kpis, setKpis] = useState({
    totalTickets: 0,
    openTickets: 0,
    criticalTickets: 0,
    pastDueTickets: 0,
    closedTickets: 0
  });
  const [kpisLoading, setKpisLoading] = useState(true);
  const [statusOptions, setStatusOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [categories, setCategories] = useState([]);
  const { scrollContainerRef } = useScrollManagement('ppm-tasks');

  useEffect(() => {
    fetchData();
    fetchKPIs();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filters]); // fetchTasks is stable since it doesn't depend on external variables

  const fetchData = async () => {
    try {
      const [statusRes, locationRes, categoriesRes] = await Promise.all([
        maintenanceAPI.getStatusOptions(),
        maintenanceAPI.getLocationOptions(),
        assetsAPI.getCategories()
      ]);
      
      // Backend returns data in nested structure: response.data.data
      const statusData = statusRes?.data?.data || statusRes?.data;
      const locationData = locationRes?.data?.data || locationRes?.data;
      
      setStatusOptions(Array.isArray(statusData) ? statusData : []);
      setLocationOptions(Array.isArray(locationData) ? locationData : []);
      setCategories(categoriesRes?.data || []);
      
      console.log('🔍 PPM Frontend Filter Debug:');
      console.log('- Status response structure:', statusRes?.data);
      console.log('- Status data extracted:', statusData);
      console.log('- Status data type:', typeof statusData, 'isArray:', Array.isArray(statusData));
      console.log('- Location response structure:', locationRes?.data);
      console.log('- Location data extracted:', locationData);
      console.log('- Location data type:', typeof locationData, 'isArray:', Array.isArray(locationData));
      console.log('- Location data (first 3):', Array.isArray(locationData) ? locationData.slice(0, 3) : locationData);
      console.log('- Setting statusOptions to:', Array.isArray(statusData) ? statusData.length + ' items' : 'empty array');
      console.log('- Setting locationOptions to:', Array.isArray(locationData) ? locationData.length + ' items' : 'empty array');
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      // Ensure arrays are set even on error
      setStatusOptions([]);
      setLocationOptions([]);
      setCategories([]);
    }
  };

  const fetchKPIs = async () => {
    try {
      setKpisLoading(true);
      const response = await maintenanceAPI.getKPIs();
      setKpis(response.data);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setKpisLoading(false);
    }
  };

  const fetchTasks = async (page = 1, pageSize = pagination.pageSize || 10) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize, // Use dynamic page size
        ...filters
      };
      
      console.log('Fetching tasks with params:', params);
      const response = await maintenanceAPI.getTasks(params);
      console.log('API Response:', response.data);
      
      const tasks = response.data.tasks || [];
      setTasks(tasks);
      
      // Set pagination info from API response
      setPagination(prev => ({
        ...prev,
        currentPage: response.data.currentPage || page,
        totalPages: response.data.totalPages || 1,
        totalCount: response.data.totalCount || 0,
        pageSize: pageSize // Store current page size
      }));
      
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
      setPagination(prev => ({ ...prev, currentPage: 1, totalPages: 1, totalCount: 0, pageSize: pageSize }));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      category: '',
      status: '',
      view: 'open'
    });
  };

  const handleViewFilter = (view) => {
    setFilters(prev => ({ ...prev, view }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
    fetchTasks(1, pagination.pageSize); // Fetch with new filter
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    const updatedPage = newPage + 1; // DataTable uses 0-based indexing, convert to 1-based
    setPagination(prev => ({ ...prev, currentPage: updatedPage }));
    fetchTasks(updatedPage, pagination.pageSize);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPagination(prev => ({ ...prev, currentPage: 1, pageSize: newPageSize }));
    fetchTasks(1, newPageSize); // Reset to page 1 when changing page size
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return Clock;
      case 'in_progress': return Wrench;
      case 'completed': return CheckCircle;
      case 'overdue': return AlertTriangle;
      default: return Clock;
    }
  };

  // TanStack Table column definitions
  const columns = useMemo(
    () => [
      {
        accessorKey: 'locationShortCode',
        header: 'Location',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="text-sm text-gray-900">
              {value != null ? String(value) : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'category',
        header: 'Category',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="text-sm text-gray-900">
              {value != null ? String(value) : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          const displayValue = value != null ? String(value) : 'N/A';
          return (
            <div className="text-sm text-gray-900 max-w-xs truncate" title={displayValue}>
              {displayValue}
            </div>
          );
        },
      },
      {
        accessorKey: 'pendingWith',
        header: 'Pending With',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          const displayValue = value != null ? String(value) : 'N/A';
          return (
            <div className="text-sm text-gray-900 max-w-xs truncate" title={displayValue}>
              {displayValue}
            </div>
          );
        },
      },
      {
        accessorKey: 'ticketNumber',
        header: 'Ticket ID',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="text-sm font-medium text-gray-900">
              {value != null ? String(value) : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: true,
        cell: ({ getValue, row }) => {
          const status = getValue();
          const statusValue = status != null ? String(status) : 'N/A';
          const StatusIcon = getStatusIcon(statusValue);
          return (
            <div className="flex items-center space-x-2">
              <StatusIcon className="h-4 w-4 text-gray-500" />
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(statusValue)}`}>
                {statusValue}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'External',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <a
              href={`https://uat-sw-ticketing-api.sworks.co.in/ticket/${row.original.ticketNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 transition-colors"
              title="Open in external system"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div ref={scrollContainerRef} className="space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PPM Tasks</h1>
          <p className="text-gray-600">View preventive maintenance tasks from external ticketing system</p>
        </div>
        <button
          onClick={() => { fetchTasks(1); fetchKPIs(); }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Tasks"
          data={kpis.totalTickets}
          icon={ClipboardList}
          color="blue"
          loading={kpisLoading}
          isActive={filters.view === 'all'}
          onClick={() => handleViewFilter('all')}
        />
        
        <KPICard
          title="Open Tasks"
          data={kpis.openTickets}
          icon={Activity}
          color="green"
          loading={kpisLoading}
          isActive={filters.view === 'open'}
          onClick={() => handleViewFilter('open')}
        />
        
        <KPICard
          title="Critical"
          data={kpis.criticalTickets}
          icon={Zap}
          color="orange"
          loading={kpisLoading}
          isActive={filters.view === 'critical'}
          onClick={() => handleViewFilter('critical')}
        />
        
        <KPICard
          title="Past Due"
          data={kpis.pastDueTickets}
          icon={AlertTriangle}
          color="red"
          loading={kpisLoading}
          isActive={filters.view === 'pastdue'}
          onClick={() => handleViewFilter('pastdue')}
        />
        
        <KPICard
          title="Closed"
          data={kpis.closedTickets}
          icon={CheckCircle}
          color="gray"
          loading={kpisLoading}
          isActive={filters.view === 'closed'}
          onClick={() => handleViewFilter('closed')}
        />
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </h3>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500">
              {Object.values(filters).filter(v => v).length} active
            </span>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              className="select"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            >
              <option value="">All Locations</option>
              {locationOptions.map((location, index) => (
                <option key={location.value || index} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="select"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              className="select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {statusOptions.map((status, index) => (
                <option key={status.value || index} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View
            </label>
            <select
              className="select"
              value={filters.view}
              onChange={(e) => handleFilterChange('view', e.target.value)}
            >
              <option value="">All Tasks</option>
              <option value="open">Open Tasks</option>
              <option value="critical">Critical Tasks</option>
              <option value="pastdue">Past Due Tasks</option>
              <option value="closed">Closed Tasks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            PPM Tasks ({tasks.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8">
            <LoadingSpinner />
          </div>
        ) : (
          <DataTable
            data={tasks}
            columns={columns}
            loading={loading}
            enableSorting={true}
            enableGlobalFilter={false} // Disable client-side filtering since we use server-side
            enablePagination={true}
            manualPagination={true} // Enable server-side pagination
            pageCount={pagination.totalPages}
            currentPage={pagination.currentPage - 1} // DataTable uses 0-based indexing
            pageSize={pagination.pageSize || 10}
            totalCount={pagination.totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            emptyState={{
              icon: Wrench,
              title: "No PPM tasks found",
              description: "Tasks are fetched from external ticketing system"
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PPMTasks;
