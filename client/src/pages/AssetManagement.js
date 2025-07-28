import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { assetsAPI, categoriesAPI, locationsAPI } from '../utils/api';
import { useScrollManagement } from '../hooks/useScrollManagement';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const AssetManagement = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // For edit mode
  const isEditMode = Boolean(id);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const { scrollContainerRef } = useScrollManagement('asset-management');
  const [locations, setLocations] = useState([]);
  const [floors, setFloors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedLocationData, setSelectedLocationData] = useState(null);
  const [selectedFloorData, setSelectedFloorData] = useState(null);
  const [formData, setFormData] = useState({
    equipment_name: '',
    category: '',
    location: '',
    asset_type: '',
    client: '',
    floor: '',
    model_number: '',
    capacity: '',
    manufacturer: '',
    serial_number: '',
    purchase_price: '',
    poc_number: '',
    poc_name: '',
    owned_by: 'Landlord', // Default to Landlord

    subcategory: '',
    make: '',
    unit: '',
    photos: [],
    maintenance_schedules: [],
    coverage: {
      vendor_name: '',
      coverage_type: 'Not Applicable',
      amc_po: '',
      amc_po_date: '',
      amc_amount: '',
      amc_type: '',
      period_from: '',
      period_till: '',
      month_of_expiry: '',
      remarks: '',
      assets_owner: '',
      types_of_service: ''
    }
  });

  useEffect(() => {
    fetchDropdownData();
    if (isEditMode && id) {
      fetchAssetData();
    }
  }, [id, isEditMode]);

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      formData.photos.forEach(photo => {
        if (photo.preview && photo.preview.startsWith('blob:')) {
          URL.revokeObjectURL(photo.preview);
        }
      });
    };
  }, [formData.photos]);

  const fetchDropdownData = async () => {
    try {
      const [locationsRes, categoriesRes] = await Promise.all([
        locationsAPI.getAll(),
        categoriesAPI.getAll()
      ]);
      
      // Debug: Log raw API response
      console.log('Raw locations API response:', locationsRes);
      console.log('Raw locations data:', locationsRes?.data);
      
      // Ensure locations is always an array with proper structure
      // API response structure: {success: true, data: Array(113)}
      const locationData = locationsRes?.data?.data || [];
      console.log('Location data type:', typeof locationData, 'isArray:', Array.isArray(locationData));
      console.log('Location data length:', locationData.length);
      
      const processedLocations = Array.isArray(locationData) 
        ? locationData.map((location, index) => {
            console.log(`Processing location ${index}:`, location);
            const processed = {
              value: location.value || location.name || location.id,
              label: location.label || location.name,
              id: location.id,
              centerId: location.centerId,
              alternateId: location.alternateId
            };
            console.log(`Processed location ${index}:`, processed);
            return processed;
          })
        : [];
      
      console.log('Final processed locations:', processedLocations);
      
      // Ensure categories is always an array with proper structure
      const categoryData = categoriesRes?.data || [];
      const processedCategories = Array.isArray(categoryData) 
        ? categoryData.map(category => ({
            id: category.id,
            name: category.name,
            value: category.name,
            label: category.name
          }))
        : [];
      
      setLocations(processedLocations);
      setCategories(processedCategories);
      
      console.log('Dropdown data loaded:', {
        locations: processedLocations.length,
        categories: processedCategories.length
      });
      
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      // Set empty arrays as fallback to prevent map errors
      setLocations([]);
      setCategories([]);
      alert('Error loading form data. Please refresh the page.');
    }
  };

  // Load floors when location changes
  const loadFloors = async (locationData) => {
    if (!locationData?.centerId) {
      setFloors([]);
      setSelectedFloorData(null);
      setFormData(prev => ({ ...prev, floor: '' }));
      return;
    }
    
    try {
      const response = await locationsAPI.getFloors(locationData.centerId);
      setFloors(response.data);
    } catch (error) {
      console.error('Error fetching floors:', error);
      alert('Error loading floors');
      setFloors([]);
    }
  };

  // Load subcategories when category changes
  const loadSubcategories = async (categoryName) => {
    if (!categoryName) {
      setSubcategories([]);
      return;
    }
    
    try {
      const response = await categoriesAPI.getSubcategoriesByName(categoryName);
      setSubcategories(response.data);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      setSubcategories([]);
    }
  };

  const fetchAssetData = useCallback(async () => {
    try {
      setInitialLoading(true);
      const response = await assetsAPI.getById(id);
      const asset = response.data;
      
      // Populate form with existing asset data
      setFormData({
        equipment_name: asset.equipment_name || '',
        category: asset.category || '',
        location: asset.location || '',
        asset_type: asset.asset_type || '',
        client: asset.client || '',
        floor: asset.floor || '',
        model_number: asset.model_number || '',
        capacity: asset.capacity || '',
        manufacturer: asset.manufacturer || '',
        serial_number: asset.serial_number || '',
        purchase_price: asset.purchase_price || '',
        poc_number: asset.poc_number || '',
        poc_name: asset.poc_name || '',
        owned_by: asset.owned_by || 'Landlord',
        subcategory: asset.subcategory || '',
        make: asset.make || '',
        unit: asset.unit || '',
        status: asset.status || 'active',
        photos: (() => {
          try {
            if (!asset.photos) return [];
            if (typeof asset.photos === 'string') {
              const parsed = JSON.parse(asset.photos);
              return Array.isArray(parsed) ? parsed.filter(photo => photo && photo.path && photo.path !== 'undefined') : [];
            }
            if (Array.isArray(asset.photos)) {
              return asset.photos.filter(photo => photo && photo.path && photo.path !== 'undefined');
            }
            return [];
          } catch (error) {
            console.error('Error parsing photos:', error);
            return [];
          }
        })(),
        maintenance_schedules: asset.maintenance_schedules || [],
        coverage: asset.coverage && asset.coverage.length > 0 ? asset.coverage[0] : {
          coverage_type: 'Not Applicable',
          vendor_name: '',
          amc_po: '',
          amc_po_date: '',
          amc_amount: '',
          amc_type: '',
          period_from: '',
          period_till: '',
          month_of_expiry: '',
          remarks: '',
          assets_owner: '',
          types_of_service: ''
        }
      });
      
      // Load subcategories for the existing asset's category
      if (asset.category) {
        await loadSubcategories(asset.category);
      }
      
      // Handle existing location and floor data for edit mode
      if (asset.location) {
        // Find matching location from central service
        const matchingLocation = locations.find(loc => 
          loc.label === asset.location || 
          loc.name === asset.location_name ||
          loc.value === asset.location
        );
        
        if (matchingLocation) {
          setSelectedLocationData(matchingLocation);
          // Load floors for the existing location
          await loadFloors(matchingLocation);
          
          // After floors are loaded, set the selected floor
          if (asset.floor) {
            // Small delay to ensure floors are loaded
            setTimeout(() => {
              const matchingFloor = floors.find(floor => 
                floor.label === asset.floor ||
                floor.name === asset.floor_name ||
                floor.value === asset.floor
              );
              if (matchingFloor) {
                setSelectedFloorData(matchingFloor);
              }
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching asset data:', error);
      alert('Error loading asset data');
      navigate('/assets');
    } finally {
      setInitialLoading(false);
    }
  }, [id, navigate]);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
      
      // Load subcategories when category changes
      if (field === 'category') {
        loadSubcategories(value);
        // Clear subcategory selection when category changes
        setFormData(prev => ({ ...prev, subcategory: '' }));
      }
    }
  };

  // Handle location selection from central service
  const handleLocationChange = (locationValue) => {
    const locationData = locations.find(loc => loc.value === locationValue);
    setSelectedLocationData(locationData);
    setFormData(prev => ({ ...prev, location: locationValue }));
    
    // Load floors for the selected location
    if (locationData) {
      loadFloors(locationData);
    } else {
      setFloors([]);
      setSelectedFloorData(null);
      setFormData(prev => ({ ...prev, floor: '' }));
    }
  };

  // Handle floor selection from central service
  const handleFloorChange = (floorValue) => {
    const floorData = floors.find(floor => floor.value === floorValue);
    setSelectedFloorData(floorData);
    setFormData(prev => ({ ...prev, floor: floorValue }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return null;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large. Please choose files under 5MB.`);
        return null;
      }
      
      return {
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      };
    }).filter(Boolean); // Remove null entries
    
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos]
    }));
    
    // Clear the input
    e.target.value = '';
  };

  const removePhoto = (index) => {
    setFormData(prev => {
      const photoToRemove = prev.photos[index];
      // Clean up object URL to prevent memory leaks
      if (photoToRemove && photoToRemove.preview && photoToRemove.preview.startsWith('blob:')) {
        URL.revokeObjectURL(photoToRemove.preview);
      }
      
      return {
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index)
      };
    });
  };

  const addMaintenanceSchedule = () => {
    setFormData(prev => ({
      ...prev,
      maintenance_schedules: [
        ...prev.maintenance_schedules,
        {
          maintenance_name: '',
          start_date: '',
          frequency: 'monthly',
          frequency_value: 1,
          owner: 'SW',
          is_active: 1
        }
      ]
    }));
  };

  const updateMaintenanceSchedule = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      maintenance_schedules: prev.maintenance_schedules.map((schedule, i) =>
        i === index ? { ...schedule, [field]: value } : schedule
      )
    }));
  };

  const removeMaintenanceSchedule = (index) => {
    setFormData(prev => ({
      ...prev,
      maintenance_schedules: prev.maintenance_schedules.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    let requiredFields = [
      'equipment_name', 'category', 'location', 'asset_type', 'floor', 'model_number',
      'capacity', 'manufacturer', 'serial_number', 'purchase_price',
      'poc_number', 'poc_name', 'owned_by', 'subcategory', 'make', 'unit'
    ];
    
    // Add client field as required if asset type is client
    if (formData.asset_type === 'client') {
      requiredFields.push('client');
    }

    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      const fieldLabels = {
        equipment_name: 'Equipment Name',
        category: 'Category',
        location: 'Location',
        asset_type: 'Asset Type',
        client: 'Client',
        floor: 'Floor',
        model_number: 'Model Number',
        capacity: 'Capacity',
        manufacturer: 'Manufacturer',
        serial_number: 'Serial Number',
        purchase_price: 'Purchase Price',
        poc_number: 'POC Number',
        poc_name: 'POC Name',
        owned_by: 'Owned By',
        subcategory: 'Subcategory',
        make: 'Make',
        unit: 'Unit'
      };
      const missingLabels = missingFields.map(field => fieldLabels[field] || field);
      alert(`Please fill in all required fields:\n\n${missingLabels.join('\n')}`);
      return;
    }

    // Additional validations
    if (formData.purchase_price && isNaN(parseFloat(formData.purchase_price))) {
      alert('Purchase price must be a valid number');
      return;
    }

    if (formData.poc_number && !/^[\d\s+\-()]+$/.test(formData.poc_number)) {
      alert('POC number must contain only numbers, spaces, and phone number characters');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare form data for submission
      const submitData = {
        ...formData,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        // Include central service location and floor data
        locationData: selectedLocationData,
        floorData: selectedFloorData
      };
      
      if (isEditMode) {
        await assetsAPI.update(id, submitData);
        alert('Asset updated successfully!');
      } else {
        await assetsAPI.create(submitData);
        alert('Asset created successfully!');
      }
      
      navigate('/assets');
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} asset:`, error);
      
      let errorMessage = `Error ${isEditMode ? 'updating' : 'creating'} asset.`;
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        switch (status) {
          case 400:
            errorMessage = `Validation Error: ${data.message || 'Invalid data provided'}`;
            break;
          case 409:
            errorMessage = `Conflict Error: ${data.message || 'Asset with this serial number already exists'}`;
            break;
          case 404:
            errorMessage = 'Asset not found. It may have been deleted.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later or contact support.';
            break;
          default:
            errorMessage = `Server Error (${status}): ${data.message || 'Unknown error occurred'}`;
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection and try again.';
      } else {
        // Other error
        errorMessage = `Unexpected error: ${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <LoadingSpinner text="Loading asset data..." />;
  if (loading) return <LoadingSpinner text={isEditMode ? "Updating asset..." : "Creating asset..."} />;

  return (
    <div ref={scrollContainerRef} className="container mx-auto px-4 py-8 h-full overflow-y-auto">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit Asset' : 'Add New Asset'}</h1>
        </div>
        <div className="mb-6">
          <Link to="/assets" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Assets
          </Link>
        </div>
        <p className="text-gray-600">{isEditMode ? 'Update asset information and settings' : 'Create a new asset record with all required information'}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Equipment Name *
              </label>
              <input
                type="text"
                className="input"
                value={formData.equipment_name}
                onChange={(e) => handleInputChange('equipment_name', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                className="select"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                required
              >
                <option value="">Select Category</option>
                {Array.isArray(categories) && categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subcategory *
              </label>
              <select
                className="select"
                value={formData.subcategory}
                onChange={(e) => handleInputChange('subcategory', e.target.value)}
                required
              >
                <option value="">Select Subcategory</option>
                {Array.isArray(subcategories) && subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.name}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <select
                className="select"
                value={formData.location}
                onChange={(e) => handleLocationChange(e.target.value)}
                required
              >
                <option value="">Select Location</option>
                {Array.isArray(locations) && locations.map(location => (
                  <option key={location.value || location.id} value={location.value || location.name}>
                    {location.label || location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asset Type *
              </label>
              <select
                className="select"
                value={formData.asset_type}
                onChange={(e) => handleInputChange('asset_type', e.target.value)}
                required
              >
                <option value="">Select Asset Type</option>
                <option value="building">Building Asset</option>
                <option value="client">Client Asset</option>
              </select>
            </div>

            {formData.asset_type === 'client' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client *
                </label>
                <select
                  className="select"
                  value={formData.client || ''}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  required
                >
                  <option value="">Select Client</option>
                  <option value="Accenture">Accenture</option>
                  <option value="TCS">TCS</option>
                  <option value="Infosys">Infosys</option>
                  <option value="Wipro">Wipro</option>
                  <option value="Cognizant">Cognizant</option>
                  <option value="HCL">HCL</option>
                  <option value="Tech Mahindra">Tech Mahindra</option>
                  <option value="Capgemini">Capgemini</option>
                  <option value="IBM">IBM</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floor *
              </label>
              <select
                className="select"
                value={formData.floor}
                onChange={(e) => handleFloorChange(e.target.value)}
                required
                disabled={!selectedLocationData}
              >
                <option value="">{!selectedLocationData ? 'Select Location First' : 'Select Floor'}</option>
                {Array.isArray(floors) && floors.map((floor) => (
                  <option key={floor.value} value={floor.value}>
                    {floor.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Number *
              </label>
              <input
                type="text"
                className="input"
                value={formData.model_number}
                onChange={(e) => handleInputChange('model_number', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity *
              </label>
              <input
                type="text"
                className="input"
                value={formData.capacity}
                onChange={(e) => handleInputChange('capacity', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit *
              </label>
              <input
                type="text"
                className="input"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manufacturer *
              </label>
              <input
                type="text"
                className="input"
                value={formData.manufacturer}
                onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number *
              </label>
              <input
                type="text"
                className="input"
                value={formData.serial_number}
                onChange={(e) => handleInputChange('serial_number', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Price *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  className="input pl-8"
                  placeholder="Enter purchase price"
                  value={formData.purchase_price}
                  onChange={(e) => handleInputChange('purchase_price', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Number *
              </label>
              <input
                type="text"
                className="input"
                value={formData.poc_number}
                onChange={(e) => handleInputChange('poc_number', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                POC Name *
              </label>
              <input
                type="text"
                className="input"
                value={formData.poc_name}
                onChange={(e) => handleInputChange('poc_name', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owned By *
              </label>
              <select
                className="select"
                value={formData.owned_by}
                onChange={(e) => handleInputChange('owned_by', e.target.value)}
                required
              >
                <option value="Landlord">Landlord</option>
                <option value="SW">SW</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Make *
              </label>
              <input
                type="text"
                className="input"
                value={formData.make}
                onChange={(e) => handleInputChange('make', e.target.value)}
                required
              />
            </div>

            {isEditMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  className="select"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Under Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Photos */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos</h3>
          <div className="mt-4">
            <div className="flex items-center space-x-2 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Photos
              </label>
              <input
                type="file"
                className="hidden"
                id="file-upload"
                multiple
                accept="image/*"
                onChange={handleFileChange}
              />
              <label
                htmlFor="file-upload"
                className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Photos
              </label>
            </div>
            <div className="grid grid-cols-4 gap-3 mt-3">
              {Array.isArray(formData.photos) && formData.photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.preview || (photo.path && photo.path !== 'undefined' ? `${process.env.REACT_APP_BASE_URL || 'http://localhost:5000'}${photo.path}` : photo.url || '')}
                    alt={`Preview ${index + 1}`}
                    className="h-24 w-full object-cover rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div 
                    className="h-24 w-full bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 text-xs" 
                    style={{display: 'none'}}
                  >
                    Image not found
                  </div>
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Maintenance Schedules */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Maintenance Schedules (Optional)</h3>
            <button
              type="button"
              onClick={addMaintenanceSchedule}
              className="btn btn-secondary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </button>
          </div>
          
          {Array.isArray(formData.maintenance_schedules) && formData.maintenance_schedules.map((schedule, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Schedule {index + 1}</h4>
                <button
                  type="button"
                  onClick={() => removeMaintenanceSchedule(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maintenance Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={schedule.maintenance_name}
                    onChange={(e) => updateMaintenanceSchedule(index, 'maintenance_name', e.target.value)}
                    placeholder="e.g., Filter Replacement, Oil Change"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={schedule.start_date}
                    onChange={(e) => updateMaintenanceSchedule(index, 'start_date', e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    className="select"
                    value={schedule.frequency}
                    onChange={(e) => updateMaintenanceSchedule(index, 'frequency', e.target.value)}
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
                    value={schedule.frequency_value || 1}
                    onChange={(e) => updateMaintenanceSchedule(index, 'frequency_value', parseInt(e.target.value) || 1)}
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
                    value={schedule.owner || 'SW'}
                    onChange={(e) => updateMaintenanceSchedule(index, 'owner', e.target.value)}
                    required
                  >
                    <option value="SW">SW</option>
                    <option value="Vendor">Vendor</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="flex items-center mt-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        checked={schedule.is_active !== 0}
                        onChange={(e) => updateMaintenanceSchedule(index, 'is_active', e.target.checked ? 1 : 0)}
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coverage Information */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AMC/Warranty Coverage</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coverage Type *
              </label>
              <select
                className="select"
                value={formData.coverage.coverage_type}
                onChange={(e) => handleInputChange('coverage.coverage_type', e.target.value)}
                required
              >
                <option value="Not Applicable">Not Applicable</option>
                <option value="AMC">AMC</option>
                <option value="Warranty">Warranty</option>
              </select>
            </div>

            {formData.coverage.coverage_type !== 'Not Applicable' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.coverage.vendor_name}
                    onChange={(e) => handleInputChange('coverage.vendor_name', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AMC PO
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.coverage.amc_po}
                    onChange={(e) => handleInputChange('coverage.amc_po', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AMC PO Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={formData.coverage.amc_po_date}
                    onChange={(e) => handleInputChange('coverage.amc_po_date', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AMC Amount (without GST)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      className="input pl-8"
                      placeholder="Enter AMC amount"
                      value={formData.coverage.amc_amount}
                      onChange={(e) => handleInputChange('coverage.amc_amount', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AMC Type
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.coverage.amc_type}
                    onChange={(e) => handleInputChange('coverage.amc_type', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period From
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={formData.coverage.period_from}
                    onChange={(e) => handleInputChange('coverage.period_from', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Period Till
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={formData.coverage.period_till}
                    onChange={(e) => handleInputChange('coverage.period_till', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assets Owner
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.coverage.assets_owner}
                    onChange={(e) => handleInputChange('coverage.assets_owner', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Types of Service
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={formData.coverage.types_of_service}
                    onChange={(e) => handleInputChange('coverage.types_of_service', e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <textarea
                    className="input"
                    rows="3"
                    value={formData.coverage.remarks}
                    onChange={(e) => handleInputChange('coverage.remarks', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/assets')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssetManagement;
