const express = require('express');
const db = require('../database');

const router = express.Router();

// Get comprehensive dashboard data
router.get('/', async (req, res) => {
  try {
    // Total assets
    const totalAssets = await db.get(
      "SELECT COUNT(*) as count FROM assets WHERE status != 'deleted'"
    );

    // Assets by location
    const assetsByLocation = await db.all(`
      SELECT 
        a.location,
        COUNT(*) as total_assets,
        COUNT(CASE WHEN c.coverage_type = 'AMC' AND c.status = 'active' THEN 1 END) as active_amc,
        COUNT(CASE WHEN c.coverage_type = 'Warranty' AND c.status = 'active' THEN 1 END) as active_warranty,
        COUNT(CASE WHEN c.period_till IS NOT NULL AND DATE(c.period_till) <= DATE('now', '+45 days') AND DATE(c.period_till) >= DATE('now') THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN c.coverage_type IS NULL OR c.coverage_type = 'Not Applicable' THEN 1 END) as uncovered
      FROM assets a
      LEFT JOIN coverage c ON a.id = c.asset_id AND c.status = 'active'
      WHERE a.status != 'deleted'
      GROUP BY a.location
      ORDER BY a.location
    `);

    // Assets by category for each location
    const assetsByCategory = await db.all(`
      SELECT 
        a.location,
        a.category,
        COUNT(*) as count
      FROM assets a
      WHERE a.status != 'deleted'
      GROUP BY a.location, a.category
      ORDER BY a.location, a.category
    `);

    // Coverage summary
    const coverageSummary = await db.get(`
      SELECT 
        COUNT(CASE WHEN c.coverage_type = 'AMC' AND c.status = 'active' THEN 1 END) as active_amc,
        COUNT(CASE WHEN c.coverage_type = 'Warranty' AND c.status = 'active' THEN 1 END) as active_warranty,
        COUNT(CASE WHEN c.period_till IS NOT NULL AND DATE(c.period_till) <= DATE('now', '+45 days') AND DATE(c.period_till) >= DATE('now') THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN c.coverage_type IS NULL OR c.coverage_type = 'Not Applicable' THEN 1 END) as no_coverage
      FROM assets a
      LEFT JOIN coverage c ON a.id = c.asset_id AND c.status = 'active'
      WHERE a.status != 'deleted'
    `);

    // PPM summary
    const ppmSummary = await db.get(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress
      FROM ppm_tasks
    `);



    // Expiring contracts in next 30 days
    const expiringContracts = await db.all(`
      SELECT 
        a.equipment_name,
        a.location,
        c.vendor_name,
        c.coverage_type,
        c.period_till,
        CAST((julianday(c.period_till) - julianday('now')) AS INTEGER) as days_left
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE c.status = 'active' 
        AND DATE(c.period_till) <= DATE('now', '+30 days')
        AND DATE(c.period_till) >= DATE('now')
      ORDER BY c.period_till ASC
      LIMIT 10
    `);

    res.json({
      totalAssets: totalAssets.count,
      assetsByLocation,
      assetsByCategory,
      coverageSummary,
      ppmSummary,
      expiringContracts
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get asset dashboard data
router.get('/assets', async (req, res) => {
  try {
    const summary = await db.get(`
      SELECT 
        COUNT(*) as total_equipments,
        COUNT(CASE WHEN c.coverage_type = 'AMC' AND c.status = 'active' THEN 1 END) as active_amc,
        COUNT(CASE WHEN c.period_till IS NOT NULL AND DATE(c.period_till) <= DATE('now', '+45 days') AND DATE(c.period_till) >= DATE('now') THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN c.coverage_type IS NULL OR c.coverage_type = 'Not Applicable' THEN 1 END) as no_coverage
      FROM assets a
      LEFT JOIN coverage c ON a.id = c.asset_id AND c.status = 'active'
      WHERE a.status != 'deleted'
    `);

    res.json(summary);
  } catch (error) {
    console.error('Error fetching asset dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
