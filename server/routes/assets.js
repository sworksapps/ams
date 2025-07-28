const express = require('express');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const db = require('../database');
const { validate } = require('../middleware/validation');
const { assetSchema, paginationSchema } = require('../validation/schemas');

const router = express.Router();

// Get all assets with filters
router.get('/', validate(paginationSchema, 'query'), async (req, res) => {
  try {
    console.log('Assets API called with query:', req.query);
    const { location, category, vendor, coverage_type, status, search } = req.query;
    
    // Build filters for Prisma
    const filters = {};
    
    if (location) filters.location = location;
    if (category) filters.category = category;
    // Remove the old deleted status check since it doesn't exist in AssetStatus enum
    
    // For search, we'll need to use Prisma's OR conditions
    if (search) {
      filters.OR = [
        { equipmentName: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Only show active and inactive assets (maintenance assets can be shown if specifically requested)
    if (!status || status === 'all') {
      // Don't add status filter - let the database service handle the default filtering
    } else {
      filters.status = status;
    }
    
    const assets = await db.getAllAssets(filters);
    
    // Transform the data to match the expected format
    const assetsWithCoverage = assets.map(asset => {
      const activeCoverage = asset.coverage.find(c => c.status === 'active');
      
      let coverageStatus = 'No Coverage';
      let daysLeft = null;
      
      if (activeCoverage && activeCoverage.periodTill) {
        const expiryDate = new Date(activeCoverage.periodTill);
        const today = new Date();
        const diffTime = expiryDate - today;
        daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysLeft < 0) {
          coverageStatus = 'Expired';
        } else if (daysLeft <= 45) {
          coverageStatus = 'Expiring Soon';
        } else {
          coverageStatus = 'Active';
        }
      }
      
      return {
        ...asset,
        // Convert Prisma field names back to snake_case for compatibility
        equipment_name: asset.equipmentName,
        asset_type: asset.assetType,
        location_name: asset.locationName,
        location_alternate_id: asset.locationAlternateId,
        location_center_id: asset.locationCenterId,
        floor_name: asset.floorName,
        floor_alternate_id: asset.floorAlternateId,
        floor_id: asset.floorId,
        model_number: asset.modelNumber,
        serial_number: asset.serialNumber,
        purchase_price: asset.purchasePrice,
        poc_number: asset.pocNumber,
        poc_name: asset.pocName,
        owned_by: asset.ownedBy,
        created_at: asset.createdAt,
        updated_at: asset.updatedAt,
        // Coverage information
        vendor_name: activeCoverage?.vendorName || null,
        coverage_type: activeCoverage?.coverageType || null,
        coverage_expiry: activeCoverage?.periodTill || null,
        coverage_status: coverageStatus,
        days_left: daysLeft,
        // Parse photos JSON
        photos: asset.photos ? JSON.parse(asset.photos) : []
      };
    });
    
    // Apply additional filters that require post-processing
    let filteredAssets = assetsWithCoverage;
    
    if (vendor) {
      filteredAssets = filteredAssets.filter(asset => asset.vendor_name === vendor);
    }
    
    if (coverage_type) {
      filteredAssets = filteredAssets.filter(asset => asset.coverage_type === coverage_type);
    }
    
    res.json(filteredAssets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch assets',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get single asset by ID
router.get('/:id', async (req, res) => {
  try {
    const asset = await db.getAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Transform the data to match expected format
    const transformedAsset = {
      ...asset,
      equipment_name: asset.equipmentName,
      asset_type: asset.assetType,
      location_name: asset.locationName,
      location_alternate_id: asset.locationAlternateId,
      location_center_id: asset.locationCenterId,
      floor_name: asset.floorName,
      floor_alternate_id: asset.floorAlternateId,
      floor_id: asset.floorId,
      model_number: asset.modelNumber,
      serial_number: asset.serialNumber,
      purchase_price: asset.purchasePrice,
      poc_number: asset.pocNumber,
      poc_name: asset.pocName,
      owned_by: asset.ownedBy,
      created_at: asset.createdAt,
      updated_at: asset.updatedAt,
      photos: asset.photos ? JSON.parse(asset.photos) : [],
      maintenance_schedules: asset.maintenanceSchedules.map(schedule => ({
        ...schedule,
        asset_id: schedule.assetId,
        maintenance_name: schedule.maintenanceName,
        start_date: schedule.startDate,
        frequency_value: schedule.frequencyValue,
        is_active: schedule.isActive,
        created_at: schedule.createdAt
      })),
      coverage: asset.coverage.map(cov => ({
        ...cov,
        asset_id: cov.assetId,
        vendor_name: cov.vendorName,
        coverage_type: cov.coverageType,
        amc_po: cov.amcPo,
        amc_po_date: cov.amcPoDate,
        amc_amount: cov.amcAmount,
        amc_type: cov.amcType,
        period_from: cov.periodFrom,
        period_till: cov.periodTill,
        month_of_expiry: cov.monthOfExpiry,
        assets_owner: cov.assetsOwner,
        types_of_service: cov.typesOfService,
        created_at: cov.createdAt,
        updated_at: cov.updatedAt
      }))
    };
    
    res.json(transformedAsset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new asset
router.post('/', validate(assetSchema), async (req, res) => {
  try {
    const {
      equipment_name,
      category,
      location,
      locationData, // Central service location data
      asset_type,
      client,
      floor,
      floorData, // Central service floor data
      model_number,
      capacity,
      manufacturer,
      serial_number,
      purchase_price,
      poc_number,
      poc_name,
      owned_by,
      subcategory,
      make,
      unit,
      photos,
      maintenance_schedules,
      coverage
    } = req.body;

    const assetId = uuidv4();
    
    // Map asset_type from API format to Prisma enum
    let mappedAssetType;
    if (asset_type === 'Building asset') {
      mappedAssetType = 'building';
    } else if (asset_type === 'Client asset') {
      mappedAssetType = 'client';
    } else {
      mappedAssetType = asset_type; // fallback
    }
    
    // Prepare asset data for Prisma
    const assetData = {
      id: assetId,
      equipmentName: equipment_name,
      category,
      location: locationData?.label || location,
      locationName: locationData?.name || null,
      locationAlternateId: locationData?.alternateId || null,
      locationCenterId: locationData?.centerId || null,
      assetType: mappedAssetType,
      client,
      floor,
      floorName: floorData?.name || null,
      floorAlternateId: floorData?.alternateId || null,
      floorId: floorData?.floorId || null,
      modelNumber: model_number,
      capacity,
      manufacturer,
      serialNumber: serial_number,
      purchasePrice: purchase_price ? parseFloat(purchase_price) : null,
      pocNumber: poc_number,
      pocName: poc_name,
      ownedBy: owned_by,
      subcategory,
      make,
      unit,
      photos: photos ? JSON.stringify(photos) : null,
      status: 'active'
    };

    // Create the asset
    const createdAsset = await db.createAsset(assetData);
    
    // Create maintenance schedules if provided
    if (maintenance_schedules && maintenance_schedules.length > 0) {
      for (const schedule of maintenance_schedules) {
        await db.createMaintenanceSchedule({
          id: uuidv4(),
          assetId: assetId,
          maintenanceName: schedule.maintenance_name,
          startDate: new Date(schedule.start_date),
          frequency: schedule.frequency,
          owner: schedule.owner || 'SW'
        });
      }
    }
    
    // Create coverage if provided
    if (coverage && coverage.coverage_type !== 'Not Applicable') {
      await db.createCoverage({
        id: uuidv4(),
        assetId: assetId,
        vendorName: coverage.vendor_name,
        coverageType: coverage.coverage_type,
        amcPo: coverage.amc_po,
        amcPoDate: coverage.amc_po_date ? new Date(coverage.amc_po_date) : null,
        amcAmount: coverage.amc_amount ? parseFloat(coverage.amc_amount) : null,
        amcType: coverage.amc_type,
        periodFrom: coverage.period_from ? new Date(coverage.period_from) : null,
        periodTill: coverage.period_till ? new Date(coverage.period_till) : null,
        monthOfExpiry: coverage.month_of_expiry,
        status: 'active',
        remarks: coverage.remarks,
        assetsOwner: coverage.assets_owner,
        typesOfService: coverage.types_of_service
      });
    }
    
    res.status(201).json({ id: assetId, message: 'Asset created successfully' });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update asset
router.put('/:id', validate(assetSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Transform the update data to match Prisma field names
    const processedData = {};
    
    // Map snake_case to camelCase for Prisma
    const fieldMapping = {
      equipment_name: 'equipmentName',
      asset_type: 'assetType',
      model_number: 'modelNumber',
      serial_number: 'serialNumber',
      purchase_price: 'purchasePrice',
      poc_number: 'pocNumber',
      poc_name: 'pocName',
      owned_by: 'ownedBy'
    };
    
    Object.keys(updateData).forEach(key => {
      if (fieldMapping[key]) {
        let value = updateData[key];
        // Map asset_type enum values from API format to Prisma enum
        if (key === 'asset_type') {
          if (value === 'Building asset') {
            value = 'building';
          } else if (value === 'Client asset') {
            value = 'client';
          }
        }
        processedData[fieldMapping[key]] = value;
      } else if (key !== 'locationData' && key !== 'floorData' && key !== 'id') {
        processedData[key] = updateData[key];
      }
    });
    
    // Process location data if provided
    if (updateData.locationData) {
      processedData.location = updateData.locationData.label;
      processedData.locationName = updateData.locationData.name;
      processedData.locationAlternateId = updateData.locationData.alternateId;
      processedData.locationCenterId = updateData.locationData.centerId;
    }
    
    // Process floor data if provided
    if (updateData.floorData) {
      processedData.floor = updateData.floorData.label;
      processedData.floorName = updateData.floorData.name;
      processedData.floorAlternateId = updateData.floorData.alternateId;
      processedData.floorId = updateData.floorData.floorId;
    }
    
    // Handle photos JSON serialization
    if (processedData.photos) {
      processedData.photos = JSON.stringify(processedData.photos);
    }
    
    // Handle numeric fields
    if (processedData.purchasePrice) {
      processedData.purchasePrice = parseFloat(processedData.purchasePrice);
    }
    
    await db.updateAsset(id, processedData);
    
    res.json({ message: 'Asset updated successfully' });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete asset (soft delete) - set to inactive since 'deleted' doesn't exist in AssetStatus enum
router.delete('/:id', async (req, res) => {
  try {
    await db.updateAsset(req.params.id, { status: 'inactive' });
    
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get locations for dropdown from external service
router.get('/data/locations', async (req, res) => {
  try {
    const CentralLocationService = require('../utils/centralLocationService');
    const result = await CentralLocationService.fetchLocations();
    
    if (result.success) {
      const locationOptions = CentralLocationService.transformLocationOptions(result.data);
      res.json(locationOptions);
    } else {
      console.error('Failed to fetch locations from external service:', result.error);
      res.status(500).json({ error: 'Failed to fetch locations from external service' });
    }
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get categories for dropdown
router.get('/data/categories', async (req, res) => {
  try {
    const categories = await db.getCategoriesHierarchy();
    
    // Transform to match expected format
    const transformedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      parent_id: category.parentId,
      is_active: category.isActive,
      created_at: category.createdAt,
      children: category.children.map(child => ({
        id: child.id,
        name: child.name,
        parent_id: child.parentId,
        is_active: child.isActive,
        created_at: child.createdAt
      }))
    }));
    
    res.json(transformedCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
