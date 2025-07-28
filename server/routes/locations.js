const express = require('express');
const CentralLocationService = require('../utils/centralLocationService');

const router = express.Router();

/**
 * Get all locations from central service
 * GET /api/locations
 */
router.get('/', async (req, res) => {
  try {
    console.log('📍 Fetching locations from central service');
    
    const result = await CentralLocationService.fetchLocations();
    
    if (result.success) {
      // Transform the data for frontend consumption
      const locationOptions = CentralLocationService.transformLocationOptions(result.data);
      
      console.log('✅ Locations transformed successfully:', {
        originalCount: result.data.length,
        transformedCount: locationOptions.length
      });
      
      res.json({
        success: true,
        data: locationOptions,
        responseTime: result.responseTime
      });
    } else {
      console.log('❌ Failed to fetch locations:', result.error);
      res.status(500).json({
        success: false,
        error: result.error,
        data: []
      });
    }
  } catch (error) {
    console.error('💥 Exception in locations endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

/**
 * Get floors for a specific center/location
 * GET /api/locations/:centerId/floors
 */
router.get('/:centerId/floors', async (req, res) => {
  try {
    const { centerId } = req.params;
    
    if (!centerId) {
      return res.status(400).json({
        success: false,
        error: 'Center ID is required',
        data: []
      });
    }
    
    console.log('🏢 Fetching floors for center:', centerId);
    
    const result = await CentralLocationService.fetchFloors(centerId);
    
    if (result.success) {
      // Transform the data for frontend consumption
      const floorOptions = CentralLocationService.transformFloorOptions(result.data);
      
      console.log('✅ Floors transformed successfully:', {
        centerId,
        originalCount: result.data.length,
        transformedCount: floorOptions.length
      });
      
      res.json({
        success: true,
        data: floorOptions,
        responseTime: result.responseTime
      });
    } else {
      console.log('❌ Failed to fetch floors:', result.error);
      res.status(500).json({
        success: false,
        error: result.error,
        data: []
      });
    }
  } catch (error) {
    console.error('💥 Exception in floors endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      data: []
    });
  }
});

module.exports = router;
