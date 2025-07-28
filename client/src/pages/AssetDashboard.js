import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Search, Download, Eye, Edit, Wrench, Calendar, Shield, Filter, X, ChevronUp, ChevronDown } from 'lucide-react';
import { assetsAPI, locationsAPI, categoriesAPI } from '../utils/api';
import { useScrollManagement } from '../hooks/useScrollManagement';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const AssetDashboard = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const { scrollContainerRef } = useScrollManagement('asset-dashboard');

  // Filter assets based on search and filters
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = !searchTerm || 
        asset.equipment_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.model?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLocation = selectedLocation === 'all' || asset.location === selectedLocation;
      const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
      
      return matchesSearch && matchesLocation && matchesCategory;
    });
  }, [assets, searchTerm, selectedLocation, selectedCategory]);

  // Sort filtered assets
  const sortedAssets = useMemo(() => {
    if (!sortConfig.key) return filteredAssets;
    
    return [...filteredAssets].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAssets, sortConfig]);

  // Paginate assets
  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAssets, currentPage, itemsPerPage]);

  // Calculate KPIs from filtered assets
  const kpiData = useMemo(() => {
    const totalAssets = filteredAssets.length;
    const activeRepairs = filteredAssets.filter(asset => asset.status === 'Under Repair').length;
    const breakdowns = filteredAssets.filter(asset => asset.status === 'Breakdown').length;
    const activePPM = filteredAssets.filter(asset => asset.ppm_status === 'Active').length;
    const overduePPM = filteredAssets.filter(asset => asset.ppm_status === 'Overdue').length;
    const activeCoverage = filteredAssets.filter(asset => asset.coverage_status === 'Active').length;
    const expiringSoon = filteredAssets.filter(asset => asset.coverage_status === 'Expiring Soon').length;
    
    return {
      totalAssets,
      activeRepairs,
      breakdowns,
      activePPM,
      overduePPM,
      activeCoverage,
      expiringSoon
    };
  }, [filteredAssets]);

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [assetsRes, locationsRes, categoriesRes] = await Promise.all([
          assetsAPI.getAll(),
          locationsAPI.getAll(),
          categoriesAPI.getAll()
        ]);
        
        setAssets(assetsRes.data || []);
        // Ensure locations is always an array
        // API response structure: {success: true, data: Array(113)}
        const locationData = locationsRes.data?.data || [];
        setLocations(Array.isArray(locationData) ? locationData : []);
        setCategories(categoriesRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        // Set default empty arrays on error
        setAssets([]);
        setLocations([]);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handlers
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedLocation('all');
    setSelectedCategory('all');
    setCurrentPage(1);
  };

  const getCoverageStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
      case 'Expiring Soon':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
      case 'Expired':
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
      default:
        return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
    }
  };



  const totalPages = Math.ceil(sortedAssets.length / itemsPerPage);

  const SortableHeader = ({ label, sortKey }) => (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen" ref={scrollContainerRef}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Title and Controls */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Asset Management</h1>
            <p className="text-sm text-gray-600 mt-1">Monitor and manage assets across all locations</p>
          </div>
          <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Location Filter */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Locations</option>
            {locations.map(location => (
              <option key={location.id} value={location.name}>{location.name}</option>
            ))}
          </select>
          
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.name}>{category.name}</option>
            ))}
          </select>
          
          {/* Export */}
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
            onClick={() => {
              const csvContent = [
                ['Equipment Name', 'Serial Number', 'Category', 'Location', 'Manufacturer', 'Model', 'Coverage Status'],
                ...filteredAssets.map(asset => [
                  asset.equipment_name || '',
                  asset.serial_number || '',
                  asset.category || '',
                  asset.location || '',
                  asset.manufacturer || '',
                  asset.model || '',
                  asset.coverage_status || 'No Coverage'
                ])
              ].map(row => row.join(',')).join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `assets-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          
          {/* Add Asset */}
          <Link 
            to="/assets/manage" 
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Asset
          </Link>
          </div>
        </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpiData.totalAssets.toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Open Repairs</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpiData.activeRepairs}
              </p>
              <p className="text-xs text-gray-500">
                {kpiData.breakdowns} breakdowns
              </p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <Wrench className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">PPM Tasks</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpiData.activePPM}
              </p>
              <p className="text-xs text-gray-500">
                {kpiData.overduePPM} overdue
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AMC Coverage</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpiData.activeCoverage}
              </p>
              <p className="text-xs text-gray-500">
                {kpiData.expiringSoon} expiring soon
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </h3>
          <button
            onClick={handleClearFilters}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
          >
            <X className="h-4 w-4 mr-1" />
            Clear All
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Assets
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by name, serial, manufacturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="all">All Locations</option>
              {Array.isArray(locations) && locations.map(location => (
                <option key={location.value || location.id || location.name} value={location.value || location.name}>
                  {location.label || location.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Assets ({filteredAssets.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <SortableHeader label="Equipment" sortKey="equipment_name" />
                <SortableHeader label="Serial Number" sortKey="serial_number" />
                <SortableHeader label="Category" sortKey="category" />
                <SortableHeader label="Location" sortKey="location" />
                <SortableHeader label="Manufacturer" sortKey="manufacturer" />
                <SortableHeader label="Model" sortKey="model" />
                <SortableHeader label="Coverage" sortKey="coverage_status" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {asset.equipment_name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">
                      {asset.serial_number || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {asset.category || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {asset.location || 'N/A'}
                    </div>
                    {asset.floor && (
                      <div className="text-xs text-gray-500">Floor: {asset.floor}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {asset.manufacturer || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {asset.model || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getCoverageStatusBadge(asset.coverage_status)}>
                      {asset.coverage_status || 'No Coverage'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        to={`/assets/${asset.id}`}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Link>
                      <Link
                        to={`/assets/edit/${asset.id}`}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, sortedAssets.length)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{sortedAssets.length}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredAssets.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No assets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedLocation !== 'all' || selectedCategory !== 'all'
              ? 'Try adjusting your filters or search terms.'
              : 'Get started by adding your first asset.'}
          </p>
          <div className="mt-6">
            <Link
              to="/assets/manage"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Link>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AssetDashboard;
