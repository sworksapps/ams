import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Edit, Trash2, ArrowLeft, Play, ExternalLink, Filter, Calendar } from 'lucide-react';
import { maintenanceAPI, assetsAPI, categoriesAPI } from '../utils/api';
import { useScrollState } from '../contexts/ScrollContext';
import DataTable from '../components/DataTable/DataTable';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const MaintenanceSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]); // Dynamic locations from central service
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({
    asset_id: '',
    location: '',
    category: '',
    subcategory: ''
  });
  const { saveScrollPosition, getScrollPosition, restoreScrollPosition } = useScrollState();
  const scrollContainerRef = useRef(null);
  const pageKey = 'maintenance-schedules';

  // Save scroll position when component unmounts
  useEffect(() => {
    return () => {
      if (scrollContainerRef.current) {
        saveScrollPosition(pageKey, scrollContainerRef.current.scrollTop);
      }
    };
  }, [saveScrollPosition, pageKey]);

  // Restore scroll position after data loads
  useEffect(() => {
    if (!loading && scrollContainerRef.current) {
      setTimeout(() => {
        restoreScrollPosition(pageKey, scrollContainerRef.current);
      }, 100);
    }
  }, [loading, restoreScrollPosition, pageKey]);

  // TanStack Table column definitions
  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'Schedule ID',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="text-xs font-mono text-gray-600">
              {value != null ? String(value) : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'asset_id',
        header: 'Asset ID',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="text-xs font-mono text-gray-600">
              {value != null ? String(value) : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'equipment_name',
        header: 'Asset Name',
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
        accessorKey: 'location',
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
        accessorKey: 'subcategory',
        header: 'Asset Subcategory',
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
        accessorKey: 'maintenance_name',
        header: 'Maintenance Name',
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
        accessorKey: 'start_date',
        header: 'Start Date',
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
        accessorKey: 'frequency',
        header: 'Frequency',
        enableSorting: true,
        cell: ({ row }) => (
          <div className="text-sm text-gray-900">
            {getFrequencyText(row.original.frequency, row.original.frequency_value)}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex space-x-2">
            <button
              onClick={() => setEditingSchedule(row.original)}
              className="text-blue-600 hover:text-blue-900"
              title="Edit Schedule"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteSchedule(row.original.id)}
              className="text-red-600 hover:text-red-900"
              title="Delete Schedule"
            >
              <Trash2 className="h-4 w-4" />
            </button>
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
    fetchSchedules();
  }, [filters]);

  const fetchData = async () => {
    try {
      const [schedulesRes, assetsRes, categoriesRes, locationsRes] = await Promise.all([
        maintenanceAPI.getSchedules(),
        assetsAPI.getAll(),
        assetsAPI.getCategories(),
        maintenanceAPI.getLocationOptions() // Fetch dynamic locations from central service
      ]);
      setSchedules(schedulesRes.data);
      setAssets(assetsRes.data);
      setCategories(categoriesRes.data);
      // API response structure: {success: true, data: Array}
      const locationData = locationsRes.data?.data || [];
      setLocations(Array.isArray(locationData) ? locationData : []); // Set dynamic locations
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualGenerate = async () => {
    setGenerating(true);
    try {
      const response = await maintenanceAPI.generatePPMTasksAdminMode();
      alert(`PPM tasks generated successfully! Created: ${response.data.tasksCreated}, Skipped: ${response.data.tasksSkipped}`);
    } catch (error) {
      console.error('Error generating PPM tasks:', error);
      alert('Error generating PPM tasks. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await maintenanceAPI.getSchedules(filters);
      setSchedules(response.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const handleCreateSchedule = async (scheduleData) => {
    try {
      await maintenanceAPI.createSchedule(scheduleData);
      fetchSchedules();
      setShowCreateModal(false);
      alert('Maintenance schedule created successfully!');
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating schedule. Please try again.');
    }
  };

  const handleUpdateSchedule = async (id, scheduleData) => {
    try {
      await maintenanceAPI.updateSchedule(id, scheduleData);
      fetchSchedules();
      setEditingSchedule(null);
      alert('Maintenance schedule updated successfully!');
    } catch (error) {
      console.error('Error updating schedule:', error);
      alert('Error updating schedule. Please try again.');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this maintenance schedule?')) {
      try {
        await maintenanceAPI.updateSchedule(id, { is_active: 0 });
        fetchSchedules();
        alert('Maintenance schedule deactivated successfully!');
      } catch (error) {
        console.error('Error deactivating schedule:', error);
        alert('Error deactivating schedule. Please try again.');
      }
    }
  };

  const getFrequencyText = (frequency, frequencyValue) => {
    const value = frequencyValue || 1;
    const unit = value === 1 ? frequency.slice(0, -2) : frequency;
    return `Every ${value > 1 ? value + ' ' : ''}${unit}${value > 1 ? 's' : ''}`;
  };

  if (loading) return <LoadingSpinner text="Loading maintenance schedules..." />;

  return (
    <div ref={scrollContainerRef} className="space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center mb-2">
            <Link 
              to="/maintenance/tasks" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to PPM Tasks
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Schedules</h1>
          <p className="text-gray-600">Manage preventive maintenance schedules for your assets</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleManualGenerate}
            disabled={generating}
            className="btn btn-secondary flex items-center"
          >
            <Play className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Generate PPM Tasks'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Schedule
          </button>
        </div>
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
              onClick={() => setFilters({ asset_id: '', location: '', category: '', subcategory: '' })}
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
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location.value} value={location.value}>
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
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value, subcategory: '' }))}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategory
            </label>
            <select
              className="select"
              value={filters.subcategory}
              onChange={(e) => setFilters(prev => ({ ...prev, subcategory: e.target.value }))}
              disabled={!filters.category}
            >
              <option value="">All Subcategories</option>
              {filters.category && categories
                .find(cat => cat.name === filters.category)?.subcategories
                ?.map(subcategory => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Asset
            </label>
            <select
              className="select"
              value={filters.asset_id}
              onChange={(e) => setFilters(prev => ({ ...prev, asset_id: e.target.value }))}
            >
              <option value="">All Assets</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.equipment_name} - {asset.location}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Schedules List */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Active Schedules</h3>
        </div>
        
        {schedules.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance schedules found</h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first maintenance schedule.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              Create Schedule
            </button>
          </div>
        ) : (
          <DataTable
            data={schedules}
            columns={columns}
            loading={loading}
            enableSorting={true}
            enableFiltering={true}
            enablePagination={true}
            enableGrouping={true}
            enableRowSelection={true}
            enableColumnVisibility={true}
            enableGlobalFilter={true}
            enableExport={true}
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            emptyMessage="No maintenance schedules found. Create your first schedule to get started."
            className="mt-6"
            onExport={(data) => {
              // Export functionality - convert to CSV
              const csvContent = [
                ['Location', 'Subcategory', 'Category', 'Maintenance Name', 'Equipment', 'Start Date', 'Frequency'],
                ...data.map(schedule => [
                  schedule.location,
                  schedule.subcategory,
                  schedule.category,
                  schedule.maintenance_name,
                  schedule.equipment_name,
                  format(new Date(schedule.start_date), 'MMM dd, yyyy'),
                  getFrequencyText(schedule.frequency, schedule.frequency_value)
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `maintenance-schedules-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
          />
        )}
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <ScheduleModal
          assets={assets}
          onSubmit={handleCreateSchedule}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Schedule Modal */}
      {editingSchedule && (
        <ScheduleModal
          assets={assets}
          schedule={editingSchedule}
          onSubmit={(data) => handleUpdateSchedule(editingSchedule.id, data)}
          onClose={() => setEditingSchedule(null)}
        />
      )}
    </div>
  );
};

// Schedule Modal Component
const ScheduleModal = ({ assets, schedule, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    asset_id: schedule?.asset_id || '',
    maintenance_name: schedule?.maintenance_name || '',
    start_date: schedule?.start_date || '',
    frequency: schedule?.frequency || 'monthly',
    frequency_value: schedule?.frequency_value || 1,
    owner: schedule?.owner || 'SW',
    is_active: schedule?.is_active !== undefined ? schedule.is_active : 1
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.asset_id || !formData.maintenance_name || !formData.start_date) {
      alert('Please fill in all required fields');
      return;
    }

    onSubmit(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {schedule ? 'Edit Schedule' : 'Create New Schedule'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asset *
              </label>
              <select
                className="select"
                value={formData.asset_id}
                onChange={(e) => handleInputChange('asset_id', e.target.value)}
                required
              >
                <option value="">Select Asset</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.equipment_name} - {asset.location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Name *
              </label>
              <input
                type="text"
                className="input"
                value={formData.maintenance_name}
                onChange={(e) => handleInputChange('maintenance_name', e.target.value)}
                placeholder="e.g., Filter Replacement, Oil Change"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                className="input"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency *
              </label>
              <select
                className="select"
                value={formData.frequency}
                onChange={(e) => handleInputChange('frequency', e.target.value)}
                required
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency Value
              </label>
              <input
                type="number"
                className="input"
                value={formData.frequency_value}
                onChange={(e) => handleInputChange('frequency_value', parseInt(e.target.value))}
                min="1"
                placeholder="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                e.g., 2 for "Every 2 months"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner *
              </label>
              <select
                className="select"
                value={formData.owner}
                onChange={(e) => handleInputChange('owner', e.target.value)}
                required
              >
                <option value="SW">SW</option>
                <option value="Vendor">Vendor</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Who is responsible for this maintenance
              </p>
            </div>

            {schedule && (
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={formData.is_active === 1}
                    onChange={(e) => handleInputChange('is_active', e.target.checked ? 1 : 0)}
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
            )}

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
                {schedule ? 'Update' : 'Create'} Schedule
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSchedules;
