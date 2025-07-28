import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Package, Edit, Trash2, Shield, Wrench, Ticket, Calendar, MapPin, Clock, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { assetsAPI, maintenanceAPI, amcRenewalAPI, repairsAPI } from '../utils/api';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { format } from 'date-fns';
import { useScrollManagement } from '../hooks/useScrollManagement';

const AssetDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [ppmTasks, setPpmTasks] = useState([]);
  const [amcRenewals, setAmcRenewals] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [loadingPPM, setLoadingPPM] = useState(false);
  const [loadingAMC, setLoadingAMC] = useState(false);
  const [loadingRepairs, setLoadingRepairs] = useState(false);
  const { scrollContainerRef } = useScrollManagement('asset-details');

  useEffect(() => {
    fetchAssetDetails();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'ppm') {
      fetchPPMTasks();
    } else if (activeTab === 'coverage') {
      fetchAMCRenewals();
    } else if (activeTab === 'tickets') {
      fetchRepairs();
    }
  }, [activeTab, id]);

  const fetchAssetDetails = async () => {
    try {
      setLoading(true);
      const response = await assetsAPI.getById(id);
      setAsset(response.data);
    } catch (err) {
      setError('Failed to fetch asset details');
      console.error('Asset details error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPPMTasks = async () => {
    try {
      setLoadingPPM(true);
      // Filter PPM tasks by asset ID
      const response = await maintenanceAPI.getExternalTasks({ 
        page: 1, 
        limit: 50,
        search: asset?.equipment_name || '',
        view: 'all'
      });
      setPpmTasks(response.data || []);
    } catch (err) {
      console.error('Error fetching PPM tasks:', err);
      setPpmTasks([]);
    } finally {
      setLoadingPPM(false);
    }
  };

  const fetchAMCRenewals = async () => {
    try {
      setLoadingAMC(true);
      // Filter AMC renewals by asset ID
      const response = await amcRenewalAPI.getExternalTickets({ 
        page: 1, 
        limit: 50,
        search: asset?.equipment_name || ''
      });
      setAmcRenewals(response.data || []);
    } catch (err) {
      console.error('Error fetching AMC renewals:', err);
      setAmcRenewals([]);
    } finally {
      setLoadingAMC(false);
    }
  };

  const fetchRepairs = async () => {
    try {
      setLoadingRepairs(true);
      // Filter repairs by asset ID
      const response = await repairsAPI.getTickets({ 
        page: 1, 
        limit: 50,
        search: asset?.equipment_name || ''
      });
      setRepairs(response.data || []);
    } catch (err) {
      console.error('Error fetching repairs:', err);
      setRepairs([]);
    } finally {
      setLoadingRepairs(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this asset?')) {
      try {
        await assetsAPI.delete(id);
        alert('Asset deleted successfully');
        navigate('/assets');
      } catch (error) {
        console.error('Error deleting asset:', error);
        alert('Error deleting asset. Please try again.');
      }
    }
  };

  const getCoverageStatus = (coverage) => {
    if (!coverage || coverage.length === 0) return 'No Coverage';
    const activeCoverage = coverage.find(c => c.status === 'active');
    if (!activeCoverage) return 'No Active Coverage';
    
    const expiryDate = new Date(activeCoverage.period_till);
    const today = new Date();
    const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return 'Expired';
    if (daysLeft <= 30) return 'Expiring Soon';
    return 'Active';
  };

  const getCoverageStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Expiring Soon': return 'bg-yellow-100 text-yellow-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      case 'No Coverage': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-600 py-8">{error}</div>;
  if (!asset) return <div className="text-center text-gray-600 py-8">Asset not found</div>;

  const coverageStatus = getCoverageStatus(asset.coverage);

  return (
    <div ref={scrollContainerRef} className="space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-4">
          <button
            onClick={() => navigate('/assets')}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Assets
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{asset.equipment_name}</h1>
            <p className="text-gray-600">{asset.category} • {asset.location}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate(`/assets/edit/${id}`)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="card p-4">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Asset Status</p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                asset.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {asset.status?.charAt(0).toUpperCase() + asset.status?.slice(1) || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">AMC Coverage</p>
              <div className="flex flex-col">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCoverageStatusColor(coverageStatus)} mb-1`}>
                  {coverageStatus}
                </span>
                <p className="text-xs text-gray-500">{amcRenewals.length} renewal(s)</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">PPM Tasks</p>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-gray-900">{ppmTasks.length}</p>
                <p className="text-xs text-gray-500">
                  {ppmTasks.filter(task => task.status === 'open').length} open
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Wrench className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Repairs</p>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-gray-900">{repairs.length}</p>
                <p className="text-xs text-gray-500">
                  {repairs.filter(repair => repair.status !== 'closed').length} active
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Maintenance</p>
              <div className="flex flex-col">
                <p className="text-lg font-semibold text-gray-900">{asset.maintenance_schedules?.length || 0}</p>
                <p className="text-xs text-gray-500">schedule(s)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Package },
              { id: 'coverage', name: 'Coverage', icon: Shield },
              { id: 'maintenance', name: 'Maintenance', icon: Wrench },
              { id: 'ppm', name: 'PPM Tasks', icon: Calendar },
              { id: 'tickets', name: 'Repairs', icon: Ticket }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Asset ID</label>
                    <p className="mt-1 text-xs font-mono text-gray-600">{asset.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Equipment Name</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.equipment_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subcategory</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.subcategory}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-sm text-gray-900 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {asset.location}
                      {asset.floor && ` - Floor ${asset.floor}`}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Asset Type</label>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{asset.asset_type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.serial_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.manufacturer}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Make</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.make}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Model Number</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.model_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Capacity</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.capacity}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.unit}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purchase Price</label>
                    <p className="mt-1 text-sm text-gray-900">₹{asset.purchase_price?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">POC Name</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.poc_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">POC Number</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.poc_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Owned By</label>
                    <p className="mt-1 text-sm text-gray-900">{asset.owned_by}</p>
                  </div>
                </div>
              </div>

              {/* Photos */}
              {asset.photos && asset.photos.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {asset.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={`/uploads/${photo.filename}`}
                        alt={photo.originalName}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'coverage' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage Information</h3>
                {asset.coverage && asset.coverage.length > 0 ? (
                  <div className="space-y-4">
                    {asset.coverage.map((coverage) => (
                      <div key={coverage.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              coverage.coverage_type === 'AMC' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {coverage.coverage_type}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              coverage.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {coverage.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {coverage.period_from && coverage.period_till && (
                              <>
                                {format(new Date(coverage.period_from), 'MMM dd, yyyy')} - {format(new Date(coverage.period_till), 'MMM dd, yyyy')}
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Vendor:</span>
                            <span className="ml-2 text-gray-900">{coverage.vendor_name}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Amount:</span>
                            <span className="ml-2 text-gray-900">₹{coverage.amc_amount?.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">PO:</span>
                            <span className="ml-2 text-gray-900">{coverage.amc_po}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Type:</span>
                            <span className="ml-2 text-gray-900">{coverage.amc_type}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Owner:</span>
                            <span className="ml-2 text-gray-900">{coverage.assets_owner}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Services:</span>
                            <span className="ml-2 text-gray-900">{coverage.types_of_service}</span>
                          </div>
                        </div>
                        
                        {coverage.remarks && (
                          <div className="mt-3">
                            <span className="font-medium text-gray-700">Remarks:</span>
                            <p className="mt-1 text-sm text-gray-900">{coverage.remarks}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No coverage records found</p>
                )}
              </div>

              {/* AMC Renewal Tickets Card */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">AMC Renewal Tickets</h3>
                  <span className="text-sm text-gray-500">
                    {amcRenewals.length} ticket{amcRenewals.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {loadingAMC ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : amcRenewals.length > 0 ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="space-y-3">
                      {amcRenewals.slice(0, 3).map((renewal) => (
                        <div key={renewal.id} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                          <div className="flex items-center space-x-3">
                            <Shield className="h-5 w-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">Ticket #{renewal.ticketNumber}</p>
                              <p className="text-sm text-gray-600">{renewal.location}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              renewal.status === 'open' ? 'bg-green-100 text-green-800' :
                              renewal.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {renewal.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {renewal.createdAt ? format(new Date(renewal.createdAt), 'MMM dd, yyyy') : 'N/A'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {amcRenewals.length > 3 && (
                      <div className="mt-3 text-center">
                        <Link 
                          to="/amc-renewals" 
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View all {amcRenewals.length} renewal tickets →
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No AMC renewal tickets found for this asset</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Maintenance Schedules</h3>
              {asset.maintenance_schedules && asset.maintenance_schedules.length > 0 ? (
                <div className="space-y-4">
                  {asset.maintenance_schedules.map((schedule) => (
                    <div key={schedule.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{schedule.maintenance_name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          schedule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {schedule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Start Date:</span>
                          <span className="ml-2 text-gray-900">
                            {schedule.start_date ? format(new Date(schedule.start_date), 'MMM dd, yyyy') : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Frequency:</span>
                          <span className="ml-2 text-gray-900 capitalize">{schedule.frequency}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Frequency Value:</span>
                          <span className="ml-2 text-gray-900">{schedule.frequency_value || 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No maintenance schedules found</p>
              )}
            </div>
          )}

          {activeTab === 'ppm' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">PPM Tasks</h3>
                <span className="text-sm text-gray-500">
                  {ppmTasks.length} task{ppmTasks.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {loadingPPM ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : ppmTasks.length > 0 ? (
                <div className="space-y-4">
                  {ppmTasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <div>
                            <h4 className="font-medium text-gray-900">Ticket #{task.ticketNumber}</h4>
                            <p className="text-sm text-gray-600">{task.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === 'open' ? 'bg-green-100 text-green-800' :
                            task.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                            task.status === 'critical' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Location:</span>
                          <span className="ml-2 text-gray-900">{task.locationShortCode}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Pending With:</span>
                          <span className="ml-2 text-gray-900">{task.pendingWith || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Created:</span>
                          <span className="ml-2 text-gray-900">
                            {task.createdAt ? format(new Date(task.createdAt), 'MMM dd, yyyy') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {ppmTasks.length > 5 && (
                    <div className="text-center pt-4">
                      <Link 
                        to="/ppm-tasks" 
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View all PPM tasks →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No PPM tasks found for this asset</p>
                  <p className="text-sm text-gray-400 mt-1">Tasks will appear here when maintenance schedules generate PPM tickets</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tickets' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Repairs & Maintenance</h3>
                <span className="text-sm text-gray-500">
                  {repairs.length} repair{repairs.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {loadingRepairs ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : repairs.length > 0 ? (
                <div className="space-y-6">
                  {/* Active Repairs */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-green-600" />
                      Active Repairs ({repairs.filter(r => r.status !== 'closed').length})
                    </h4>
                    {repairs.filter(repair => repair.status !== 'closed').length > 0 ? (
                      <div className="space-y-3">
                        {repairs.filter(repair => repair.status !== 'closed').map((repair) => (
                          <div key={repair.id} className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <Wrench className="h-5 w-5 text-orange-600" />
                                <div>
                                  <h5 className="font-medium text-gray-900">Ticket #{repair.ticketNumber}</h5>
                                  <p className="text-sm text-gray-600">{repair.category}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  repair.priority === 'critical' ? 'bg-red-100 text-red-800' :
                                  repair.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  repair.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {repair.priority}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  repair.status === 'open' ? 'bg-blue-100 text-blue-800' :
                                  repair.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-orange-100 text-orange-800'
                                }`}>
                                  {repair.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Location:</span>
                                <span className="ml-2 text-gray-900">{repair.location}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Created:</span>
                                <span className="ml-2 text-gray-900">
                                  {repair.createdAt ? format(new Date(repair.createdAt), 'MMM dd, yyyy') : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Pending With:</span>
                                <span className="ml-2 text-gray-900">{repair.pendingWith || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No active repairs</p>
                    )}
                  </div>

                  {/* Past Repairs */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-gray-600" />
                      Past Repairs ({repairs.filter(r => r.status === 'closed').length})
                    </h4>
                    {repairs.filter(repair => repair.status === 'closed').length > 0 ? (
                      <div className="space-y-3">
                        {repairs.filter(repair => repair.status === 'closed').slice(0, 3).map((repair) => (
                          <div key={repair.id} className="border border-gray-200 bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <CheckCircle className="h-5 w-5 text-gray-600" />
                                <div>
                                  <h5 className="font-medium text-gray-900">Ticket #{repair.ticketNumber}</h5>
                                  <p className="text-sm text-gray-600">{repair.category}</p>
                                </div>
                              </div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Closed
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Location:</span>
                                <span className="ml-2 text-gray-900">{repair.location}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Completed:</span>
                                <span className="ml-2 text-gray-900">
                                  {repair.updatedAt ? format(new Date(repair.updatedAt), 'MMM dd, yyyy') : 'N/A'}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Resolution:</span>
                                <span className="ml-2 text-gray-900">{repair.resolution || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {repairs.filter(repair => repair.status === 'closed').length > 3 && (
                          <div className="text-center pt-2">
                            <Link 
                              to="/repairs" 
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              View all {repairs.filter(repair => repair.status === 'closed').length} past repairs →
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No past repairs</p>
                    )}
                  </div>
                  
                  {repairs.length > 8 && (
                    <div className="text-center pt-4 border-t">
                      <Link 
                        to="/repairs" 
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View all repairs for this asset →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                  <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No repair records found for this asset</p>
                  <p className="text-sm text-gray-400 mt-1">Repair tickets will appear here when created</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDetails;
