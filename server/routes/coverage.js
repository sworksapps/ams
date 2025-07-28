const express = require('express');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const db = require('../database');

const router = express.Router();

// Get all coverage records with filters
router.get('/', async (req, res) => {
  try {
    const { location, vendor, coverage_type, status, expiring_days } = req.query;
    
    let sql = `
      SELECT 
        c.*,
        a.equipment_name,
        a.location,
        a.category,
        CASE 
          WHEN DATE(c.period_till) < DATE('now') THEN 'Expired'
          WHEN DATE(c.period_till) <= DATE('now', '+45 days') THEN 'Expiring Soon'
          ELSE 'Active'
        END as expiry_status,
        CAST((julianday(c.period_till) - julianday('now')) AS INTEGER) as days_left
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE a.status != 'deleted'
    `;
    
    const params = [];
    
    if (location) {
      sql += ' AND a.location = ?';
      params.push(location);
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
      sql += ' AND c.status = ?';
      params.push(status);
    }
    
    if (expiring_days) {
      sql += ' AND DATE(c.period_till) <= DATE(?, ?) AND DATE(c.period_till) >= DATE(?)';
      params.push('now', `+${expiring_days} days`, 'now');
    }
    
    sql += ' ORDER BY c.period_till ASC';
    
    const coverage = await db.all(sql, params);
    res.json(coverage);
  } catch (error) {
    console.error('Error fetching coverage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get coverage for specific asset
router.get('/asset/:assetId', async (req, res) => {
  try {
    const coverage = await db.all(
      'SELECT * FROM coverage WHERE asset_id = ? ORDER BY created_at DESC',
      [req.params.assetId]
    );
    
    res.json(coverage);
  } catch (error) {
    console.error('Error fetching asset coverage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new coverage
router.post('/', async (req, res) => {
  try {
    const {
      asset_id,
      vendor_name,
      coverage_type,
      amc_po,
      amc_po_date,
      amc_amount,
      amc_type,
      period_from,
      period_till,
      month_of_expiry,
      remarks,
      assets_owner,
      types_of_service
    } = req.body;
    
    const coverageId = uuidv4();
    
    // Deactivate existing coverage for the asset
    await db.run(
      'UPDATE coverage SET status = ? WHERE asset_id = ? AND status = ?',
      ['inactive', asset_id, 'active']
    );
    
    // Insert new coverage
    await db.run(`
      INSERT INTO coverage (
        id, asset_id, vendor_name, coverage_type, amc_po, amc_po_date,
        amc_amount, amc_type, period_from, period_till, month_of_expiry,
        status, remarks, assets_owner, types_of_service
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      coverageId, asset_id, vendor_name, coverage_type, amc_po, amc_po_date,
      amc_amount, amc_type, period_from, period_till, month_of_expiry,
      'active', remarks, assets_owner, types_of_service
    ]);
    
    res.status(201).json({ id: coverageId, message: 'Coverage created successfully' });
  } catch (error) {
    console.error('Error creating coverage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update coverage
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Build dynamic update query
    const fields = Object.keys(updateData).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updateData[field]);
    
    await db.run(
      `UPDATE coverage SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );
    
    res.json({ message: 'Coverage updated successfully' });
  } catch (error) {
    console.error('Error updating coverage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Renew coverage
router.post('/:id/renew', async (req, res) => {
  try {
    const { id } = req.params;
    const { period_from, period_till, amc_amount, amc_po, amc_po_date } = req.body;
    
    await db.run(`
      UPDATE coverage 
      SET period_from = ?, period_till = ?, amc_amount = ?, amc_po = ?, 
          amc_po_date = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [period_from, period_till, amc_amount, amc_po, amc_po_date, id]);
    
    res.json({ message: 'Coverage renewed successfully' });
  } catch (error) {
    console.error('Error renewing coverage:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get expiring contracts
router.get('/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const expiringContracts = await db.all(`
      SELECT 
        c.*,
        a.equipment_name,
        a.location,
        a.category,
        CAST((julianday(c.period_till) - julianday('now')) AS INTEGER) as days_left
      FROM coverage c
      JOIN assets a ON c.asset_id = a.id
      WHERE c.status = 'active' 
        AND DATE(c.period_till) <= DATE('now', '+' || ? || ' days')
        AND DATE(c.period_till) >= DATE('now')
      ORDER BY c.period_till ASC
    `, [days]);
    
    res.json(expiringContracts);
  } catch (error) {
    console.error('Error fetching expiring contracts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get coverage summary
router.get('/summary', async (req, res) => {
  try {
    const summary = await db.get(`
      SELECT 
        COUNT(CASE WHEN c.coverage_type = 'AMC' AND c.status = 'active' THEN 1 END) as active_amc,
        COUNT(CASE WHEN c.coverage_type = 'Warranty' AND c.status = 'active' THEN 1 END) as active_warranty,
        COUNT(CASE WHEN c.period_till IS NOT NULL AND DATE(c.period_till) <= DATE('now', '+45 days') AND DATE(c.period_till) >= DATE('now') THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN c.coverage_type IS NULL OR c.coverage_type = 'Not Applicable' THEN 1 END) as no_coverage,
        COUNT(CASE WHEN c.status = 'expired' THEN 1 END) as expired
      FROM assets a
      LEFT JOIN coverage c ON a.id = c.asset_id AND c.status = 'active'
      WHERE a.status != 'deleted'
    `);
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching coverage summary:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
