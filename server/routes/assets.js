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
    
    let sql = `
      SELECT 
        a.*,
        c.vendor_name,
        c.coverage_type,
        c.period_till as coverage_expiry,
        CASE 
          WHEN c.period_till IS NULL THEN 'No Coverage'
          WHEN DATE(c.period_till) < DATE('now') THEN 'Expired'
          WHEN DATE(c.period_till) <= DATE('now', '+45 days') THEN 'Expiring Soon'
          ELSE 'Active'
        END as coverage_status,
        CASE 
          WHEN c.period_till IS NOT NULL THEN 
            CAST((julianday(c.period_till) - julianday('now')) AS INTEGER)
          ELSE NULL
        END as days_left
      FROM assets a
      LEFT JOIN coverage c ON a.id = c.asset_id AND c.status = 'active'
      WHERE a.status != 'deleted'
    `;
    
    const params = [];
    
    if (location) {
      sql += ' AND a.location = ?';
      params.push(location);
    }
    
    if (category) {
      sql += ' AND a.category = ?';
      params.push(category);
    }
    
    if (vendor) {
      sql += ' AND c.vendor_name = ?';
      params.push(vendor);
    }
    
    if (coverage_type) {
      sql += ' AND c.coverage_type = ?';
      params.push(coverage_type);
    }
    
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    
    if (search) {
      sql += ' AND (a.equipment_name LIKE ? OR a.serial_number LIKE ? OR a.manufacturer LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY a.created_at DESC';
    
    const assets = await db.all(sql, params);
    
    // Parse photos JSON
    const assetsWithPhotos = assets.map(asset => ({
      ...asset,
      photos: asset.photos ? JSON.parse(asset.photos) : []
    }));
    
    res.json(assetsWithPhotos);
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
    const asset = await db.get('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Get maintenance schedules
    const schedules = await db.all(
      'SELECT * FROM maintenance_schedules WHERE asset_id = ? AND is_active = 1',
      [req.params.id]
    );
    
    // Get coverage
    const coverage = await db.all(
      'SELECT * FROM coverage WHERE asset_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    
    res.json({
      ...asset,
      photos: asset.photos ? JSON.parse(asset.photos) : [],
      maintenance_schedules: schedules,
      coverage: coverage
    });
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
    
    // Insert asset
    await db.run(`
      INSERT INTO assets (
        id, equipment_name, category, location, location_name, location_alternate_id, location_center_id,
        asset_type, client, floor, floor_name, floor_alternate_id, floor_id,
        model_number, capacity, manufacturer, serial_number, purchase_price,
        poc_number, poc_name, owned_by, subcategory, make, unit, photos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assetId, equipment_name, category, 
      // Legacy location field (for backward compatibility)
      locationData?.label || location,
      // Central service location fields
      locationData?.name || null,
      locationData?.alternateId || null,
      locationData?.centerId || null,
      asset_type, client,
      // Legacy floor field (for backward compatibility)
      floorData?.label || floor,
      // Central service floor fields
      floorData?.name || null,
      floorData?.alternateId || null,
      floorData?.floorId || null,
      model_number, capacity, manufacturer, serial_number, purchase_price,
      poc_number, poc_name, owned_by, subcategory, make, unit,
      JSON.stringify(photos || [])
    ]);
    
    // Insert maintenance schedules if provided
    if (maintenance_schedules && maintenance_schedules.length > 0) {
      for (const schedule of maintenance_schedules) {
        await db.run(`
          INSERT INTO maintenance_schedules (id, asset_id, maintenance_name, start_date, frequency, owner)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [uuidv4(), assetId, schedule.maintenance_name, schedule.start_date, schedule.frequency, schedule.owner || 'SW']);
      }
    }
    
    // Insert coverage if provided
    if (coverage && coverage.coverage_type !== 'Not Applicable') {
      await db.run(`
        INSERT INTO coverage (
          id, asset_id, vendor_name, coverage_type, amc_po, amc_po_date,
          amc_amount, amc_type, period_from, period_till, month_of_expiry,
          status, remarks, assets_owner, types_of_service
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(), assetId, coverage.vendor_name, coverage.coverage_type,
        coverage.amc_po, coverage.amc_po_date, coverage.amc_amount,
        coverage.amc_type, coverage.period_from, coverage.period_till,
        coverage.month_of_expiry, 'active', coverage.remarks,
        coverage.assets_owner, coverage.types_of_service
      ]);
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
    
    // Handle location and floor data transformation
    const processedData = { ...updateData };
    
    // Process location data if provided
    if (updateData.locationData) {
      processedData.location = updateData.locationData.label;
      processedData.location_name = updateData.locationData.name;
      processedData.location_alternate_id = updateData.locationData.alternateId;
      processedData.location_center_id = updateData.locationData.centerId;
      delete processedData.locationData;
    }
    
    // Process floor data if provided
    if (updateData.floorData) {
      processedData.floor = updateData.floorData.label;
      processedData.floor_name = updateData.floorData.name;
      processedData.floor_alternate_id = updateData.floorData.alternateId;
      processedData.floor_id = updateData.floorData.floorId;
      delete processedData.floorData;
    }
    
    // Build dynamic update query
    const fields = Object.keys(processedData).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => 
      field === 'photos' ? JSON.stringify(processedData[field]) : processedData[field]
    );
    
    await db.run(
      `UPDATE assets SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    
    res.json({ message: 'Asset updated successfully' });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete asset (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await db.run(
      'UPDATE assets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['deleted', req.params.id]
    );
    
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
    const categories = await db.all('SELECT * FROM categories WHERE is_active = 1 ORDER BY name');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
