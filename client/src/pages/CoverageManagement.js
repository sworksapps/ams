import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Filter, AlertTriangle, Plus, Calendar, RefreshCw } from 'lucide-react';
import { coverageAPI, assetsAPI } from '../utils/api';
import { useScrollManagement } from '../hooks/useScrollManagement';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import DataTable from '../components/DataTable/DataTable';
import { format } from 'date-fns';

const CoverageManagement = () => {
  const [coverage, setCoverage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: '',
    vendor: '',
    coverage_type: '',
    status: '',
    expiring_days: ''
  });
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedCoverage, setSelectedCoverage] = useState(null);
  const { scrollContainerRef } = useScrollManagement('coverage-management');

  // TanStack Table column definitions
  const columns = useMemo(
    () => [
      {
        accessorKey: 'equipment_name',
        header: 'Equipment',
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {row.original.equipment_name}
            </div>
            <div className="text-sm text-gray-500">
              {row.original.location}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'vendor_name',
        header: 'Vendor',
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
        accessorKey: 'coverage_type',
        header: 'Coverage Type',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCoverageTypeColor(value)}`}>
              {value != null ? String(value) : 'N/A'}
            </span>
          );
        },
      },
      {
        accessorKey: 'period_from',
        header: 'Period From',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="text-sm text-gray-900">
              {value ? format(new Date(value), 'MMM dd, yyyy') : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'period_till',
        header: 'Period Till',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="text-sm text-gray-900">
              {value ? format(new Date(value), 'MMM dd, yyyy') : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'days_left',
        header: 'Days Left',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="text-sm text-gray-900">
              {value !== null ? String(value) : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'expiry_status',
        header: 'Status',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getExpiryStatusColor(value)}`}>
              {value != null ? String(value) : 'N/A'}
            </span>
          );
        },
      },
      {
        accessorKey: 'amc_amount',
        header: 'Amount',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="text-sm text-gray-900">
              {value ? `₹${parseFloat(value).toLocaleString()}` : 'N/A'}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex space-x-2">
            {row.original.expiry_status === 'Expiring Soon' || row.original.expiry_status === 'Expired' ? (
              <button
                onClick={() => openRenewalModal(row.original)}
                className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                title="Renew Coverage"
              >
                <Calendar className="h-3 w-3 mr-1" />
                Renew
              </button>
            ) : (
              <span className="text-xs text-gray-500">Active</span>
            )}
          </div>
        ),
      },
    ],
    []
  );

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchCoverage();
  }, [filters]);

  const fetchData = async () => {
    try {
      const [locationsRes, summaryRes] = await Promise.all([
        assetsAPI.getLocations(),
        coverageAPI.getSummary()
      ]);
      setLocations(locationsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchCoverage = async () => {
    try {
      setLoading(true);
      const response = await coverageAPI.getAll(filters);
      setCoverage(response.data);
    } catch (error) {
      console.error('Error fetching coverage:', error);
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
      vendor: '',
      coverage_type: '',
      status: '',
      expiring_days: ''
    });
  };

  const getExpiryStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Expiring Soon': return 'bg-yellow-100 text-yellow-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCoverageTypeColor = (type) => {
    switch (type) {
      case 'AMC': return 'bg-blue-100 text-blue-800';
      case 'Warranty': return 'bg-purple-100 text-purple-800';
      case 'Not Applicable': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openRenewalModal = (coverageItem) => {
    setSelectedCoverage(coverageItem);
    setShowRenewalModal(true);
  };

  const handleRenewal = async (renewalData) => {
    try {
      await coverageAPI.renew(selectedCoverage.id, renewalData);
      fetchCoverage();
      setShowRenewalModal(false);
      setSelectedCoverage(null);
      alert('Coverage renewed successfully!');
    } catch (error) {
      console.error('Error renewing coverage:', error);
      alert('Error renewing coverage. Please try again.');
    }
  };

  return (
    <div className="space-y-6" ref={scrollContainerRef}>
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Coverage Management</h1>
        <p className="text-gray-600">Manage AMC and warranty coverage for all assets</p>
      </div>
      <button
        onClick={fetchCoverage}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Refresh data"
      >
        <RefreshCw className="h-5 w-5" />
      </button>
    </div>

    {/* Summary Cards */}
    {loading ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gray-300 rounded mr-3"></div>
              <div>
                <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
                <div className="h-6 bg-gray-300 rounded w-8"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : summary ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Coverage</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{summary.active}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{summary.expiring_soon}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-gray-900">{summary.expired}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">No Coverage</p>
              <p className="text-2xl font-bold text-gray-900">{summary.no_coverage}</p>
            </div>
          </div>
        </div>
      </div>
    ) : null}

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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
            {locations.map(location => (
              <option key={location.id} value={location.name}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Coverage Type
          </label>
          <select
            className="select"
            value={filters.coverage_type}
            onChange={(e) => handleFilterChange('coverage_type', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="AMC">AMC</option>
            <option value="Warranty">Warranty</option>
            <option value="Not Applicable">Not Applicable</option>
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
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="renewed">Renewed</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vendor
          </label>
          <input
            type="text"
            className="input"
            placeholder="Filter by vendor..."
            value={filters.vendor}
            onChange={(e) => handleFilterChange('vendor', e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expiring In (Days)
          </label>
          <select
            className="select"
            value={filters.expiring_days}
            onChange={(e) => handleFilterChange('expiring_days', e.target.value)}
          >
            <option value="">All</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
      </div>
    </div>

    {/* Coverage Table */}
    <div className="card">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Coverage Records ({coverage.length})
          </h3>
          <button
            onClick={() => {
              console.log('Generate AMC Renewal Tickets clicked');
              // TODO: Implement AMC renewal ticket generation
            }}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Calendar className="h-4 w-4" />
            <span>Generate AMC Renewal Tickets</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8">
          <LoadingSpinner />
        </div>
      ) : (
        <DataTable
          data={coverage}
          columns={columns}
          loading={loading}
          enableSorting={true}
          enableGlobalFilter={true}
          enablePagination={true}
          initialPageSize={10}
          emptyState={{
            icon: Shield,
            title: "No coverage records found",
            description: "Try adjusting your filters or check back later."
          }}
        />
      )}
    </div>

    {/* Renewal Modal */}
    {showRenewalModal && selectedCoverage && (
      <RenewalModal
        coverage={selectedCoverage}
        onRenew={handleRenewal}
        onClose={() => {
          setShowRenewalModal(false);
          setSelectedCoverage(null);
        }}
      />
    )}
  </div>
  );
};

// Renewal Modal Component
const RenewalModal = ({ coverage, onRenew, onClose }) => {
  const [formData, setFormData] = useState({
    period_from: '',
    period_till: '',
    amc_amount: coverage.amc_amount || '',
    amc_po: coverage.amc_po || '',
    amc_po_date: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onRenew(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Renew Coverage: {coverage.equipment_name}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period From
              </label>
              <input
                type="date"
                className="input"
                value={formData.period_from}
                onChange={(e) => setFormData(prev => ({ ...prev, period_from: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Period Till
              </label>
              <input
                type="date"
                className="input"
                value={formData.period_till}
                onChange={(e) => setFormData(prev => ({ ...prev, period_till: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (without GST)
              </label>
              <input
                type="number"
                className="input"
                value={formData.amc_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amc_amount: e.target.value }))}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Number
              </label>
              <input
                type="text"
                className="input"
                value={formData.amc_po}
                onChange={(e) => setFormData(prev => ({ ...prev, amc_po: e.target.value }))}
                placeholder="Enter PO number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Date
              </label>
              <input
                type="date"
                className="input"
                value={formData.amc_po_date}
                onChange={(e) => setFormData(prev => ({ ...prev, amc_po_date: e.target.value }))}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Renew Coverage
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CoverageManagement;
