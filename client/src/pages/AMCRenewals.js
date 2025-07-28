import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Search, 
  Filter, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Activity
} from 'lucide-react';
import DataTable from '../components/DataTable/DataTable';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { amcRenewalAPI } from '../utils/api';

const AMCRenewals = () => {
  const [tickets, setTickets] = useState([]);
  const [kpis, setKpis] = useState({
    totalTickets: 0,
    openTickets: 0,
    criticalTickets: 0,
    pastDueTickets: 0,
    closedTickets: 0
  });
  const [filters, setFilters] = useState({
    view: 'open',
    search: '',
    location: '',
    status: ''
  });
  const [loading, setLoading] = useState(true);
  const [kpisLoading, setKpisLoading] = useState(true);
  const [statusOptions, setStatusOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchTickets();
    fetchKPIs();
    fetchFilterOptions();
  }, [filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await amcRenewalAPI.getExternalTickets({
        view: filters.view,
        page: 1,
        limit: 50
      });
      
      if (response.success) {
        let filteredData = response.data;
        
        // Apply additional filters
        if (filters.search) {
          filteredData = filteredData.filter(ticket =>
            ticket.ticketNumber?.toLowerCase().includes(filters.search.toLowerCase()) ||
            ticket.category?.toLowerCase().includes(filters.search.toLowerCase())
          );
        }
        
        if (filters.location) {
          filteredData = filteredData.filter(ticket =>
            ticket.locationShortCode === filters.location
          );
        }
        
        if (filters.status) {
          filteredData = filteredData.filter(ticket =>
            ticket.status === filters.status
          );
        }
        
        setTickets(filteredData);
      }
    } catch (error) {
      console.error('Error fetching AMC renewal tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIs = async () => {
    try {
      setKpisLoading(true);
      const kpiData = await amcRenewalAPI.getKPIs();
      setKpis(kpiData);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setKpisLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Note: Using same endpoints as PPM since they're shared external APIs
      const [statusResponse, locationResponse] = await Promise.all([
        amcRenewalAPI.getStatusOptions(),
        amcRenewalAPI.getLocationOptions()
      ]);
      
      // Handle API response structure (responses have .data property)
      setStatusOptions(statusResponse?.data || []);
      setLocationOptions(locationResponse?.data || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
      // Set empty arrays as fallback
      setStatusOptions([]);
      setLocationOptions([]);
    }
  };

  const handleKPIClick = (view) => {
    setFilters(prev => ({ ...prev, view }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      view: 'open',
      search: '',
      location: '',
      status: ''
    });
  };

  const refreshData = () => {
    fetchTickets();
    fetchKPIs();
  };

  // Count active filters
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => 
    key !== 'view' && value && value.trim() !== ''
  ).length;

  // Table columns configuration
  const columns = React.useMemo(() => [
    {
      accessorKey: 'ticketNumber',
      header: 'Ticket ID',
      cell: ({ getValue }) => {
        const value = getValue();
        return (
          <span className="font-medium text-blue-600">
            {value != null ? String(value) : 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'locationShortCode',
      header: 'Location',
      cell: ({ getValue }) => {
        const value = getValue();
        return (
          <span className="text-gray-900">
            {value != null ? String(value) : 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ getValue }) => {
        const value = getValue();
        return (
          <span className="text-gray-900">
            {value != null ? String(value) : 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const status = getValue();
        const statusColors = {
          'open': 'bg-green-100 text-green-800',
          'in_progress': 'bg-yellow-100 text-yellow-800',
          'closed': 'bg-gray-100 text-gray-800',
          'critical': 'bg-red-100 text-red-800'
        };
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
          </span>
        );
      }
    },
    {
      accessorKey: 'pendingWith',
      header: 'Pending With',
      cell: ({ getValue }) => {
        const value = getValue();
        if (!value || value === 'N/A') return <span className="text-gray-400">N/A</span>;
        
        // Handle object values (e.g., {_id, name, email})
        let displayValue;
        if (typeof value === 'object' && value !== null) {
          displayValue = value.name || value.email || value._id || 'Unknown';
        } else {
          displayValue = String(value);
        }
        
        return (
          <span 
            className="text-gray-900 truncate block max-w-32"
            title={displayValue}
          >
            {displayValue}
          </span>
        );
      }
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString() : 'N/A';
      }
    },
    {
      accessorKey: 'dueDate',
      header: 'Due Date',
      cell: ({ getValue }) => {
        const date = getValue();
        return date ? new Date(date).toLocaleDateString() : 'N/A';
      }
    }
  ], []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AMC Renewals</h1>
          <p className="text-gray-600">Manage AMC renewal tickets and coverage expiry</p>
        </div>
        <button
          onClick={refreshData}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div 
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all ${filters.view === 'all' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
          onClick={() => handleKPIClick('all')}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClipboardList className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpisLoading ? '...' : kpis.totalTickets}
              </p>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all ${filters.view === 'open' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
          onClick={() => handleKPIClick('open')}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Open</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpisLoading ? '...' : kpis.openTickets}
              </p>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all ${filters.view === 'critical' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
          onClick={() => handleKPIClick('critical')}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Critical</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpisLoading ? '...' : kpis.criticalTickets}
              </p>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all ${filters.view === 'past_due' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
          onClick={() => handleKPIClick('past_due')}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Past Due</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpisLoading ? '...' : kpis.pastDueTickets}
              </p>
            </div>
          </div>
        </div>

        <div 
          className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all ${filters.view === 'closed' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'}`}
          onClick={() => handleKPIClick('closed')}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Closed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {kpisLoading ? '...' : kpis.closedTickets}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <span className="text-sm text-gray-500">
                {activeFiltersCount} active
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Locations</option>
              {locationOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            AMC Renewal Tickets
          </h3>
          
          {loading ? (
            <div className="p-8">
              <LoadingSpinner />
            </div>
          ) : (
            <DataTable
              data={tickets}
              columns={columns}
              loading={loading}
              enableSorting={true}
              enableGlobalFilter={true}
              enablePagination={true}
              initialPageSize={10}
              emptyState={{
                icon: AlertTriangle,
                title: "No AMC renewal tickets found",
                description: "Tickets will appear here when AMC renewals are due"
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AMCRenewals;
