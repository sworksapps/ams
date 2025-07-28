const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'asset_management.db');

class Database {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Assets table
      `CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        equipment_name TEXT NOT NULL,
        category TEXT NOT NULL,
        location TEXT NOT NULL,
        location_name TEXT, -- Central service location name
        location_alternate_id TEXT, -- Central service alternateID
        location_center_id TEXT, -- Central service centerId
        asset_type TEXT NOT NULL CHECK(asset_type IN ('building', 'client')),
        client TEXT, -- Client name when asset_type is 'client'
        floor TEXT,
        floor_name TEXT, -- Central service floor name
        floor_alternate_id TEXT, -- Central service floor alternateId
        floor_id TEXT, -- Central service floorId
        model_number TEXT,
        capacity TEXT,
        manufacturer TEXT,
        serial_number TEXT UNIQUE,
        purchase_price REAL,
        poc_number TEXT,
        poc_name TEXT,
        owned_by TEXT,
        owner TEXT DEFAULT 'SW' CHECK(owner IN ('SW', 'Vendor')), -- maintenance owner
        subcategory TEXT,
        make TEXT,
        unit TEXT,
        photos TEXT, -- JSON array of photo paths
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Maintenance schedules table
      `CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        maintenance_name TEXT NOT NULL,
        start_date DATE NOT NULL,
        frequency TEXT NOT NULL, -- daily, weekly, monthly, quarterly, yearly
        frequency_value INTEGER DEFAULT 1, -- every X days/weeks/months
        owner TEXT DEFAULT 'SW' CHECK(owner IN ('SW', 'Vendor')), -- maintenance owner
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE
      )`,

      // Coverage (AMC/Warranty) table
      `CREATE TABLE IF NOT EXISTS coverage (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        vendor_name TEXT NOT NULL,
        coverage_type TEXT NOT NULL CHECK(coverage_type IN ('AMC', 'Warranty', 'Not Applicable')),
        amc_po TEXT,
        amc_po_date DATE,
        amc_amount REAL,
        amc_type TEXT,
        period_from DATE,
        period_till DATE,
        month_of_expiry TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'renewed')),
        remarks TEXT,
        assets_owner TEXT,
        types_of_service TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE
      )`,







      // Categories table for dropdown data
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        parent_id TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories (id)
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Run database migrations
    await this.runMigrations();

    // Insert default data
    await this.insertDefaultData();
  }

  async runMigrations() {
    try {
      // Check if owner column exists in maintenance_schedules table
      const tableInfo = await this.all("PRAGMA table_info(maintenance_schedules)");
      const hasOwnerColumn = tableInfo.some(column => column.name === 'owner');
      
      if (!hasOwnerColumn) {
        console.log('Adding owner column to maintenance_schedules table...');
        await this.run(`
          ALTER TABLE maintenance_schedules 
          ADD COLUMN owner TEXT DEFAULT 'SW' CHECK(owner IN ('SW', 'Vendor'))
        `);
        console.log('Owner column added successfully');
      }
      
      // PPM tasks table migration removed - we no longer store PPM tasks internally
      // All PPM task data is now fetched from external ticketing API
      
      // Remove owner column from assets table (maintenance owner should only be in schedules)
      const assetsInfo = await this.all("PRAGMA table_info(assets)");
      const hasAssetOwnerColumn = assetsInfo.some(column => column.name === 'owner');
      
      if (hasAssetOwnerColumn) {
        console.log('Removing owner column from assets table...');
        // SQLite doesn't support DROP COLUMN, so we need to recreate the table
        await this.run(`
          CREATE TABLE assets_new (
            id TEXT PRIMARY KEY,
            equipment_name TEXT NOT NULL,
            category TEXT NOT NULL,
            location TEXT NOT NULL,
            asset_type TEXT NOT NULL CHECK(asset_type IN ('building', 'client')),
            client TEXT,
            floor TEXT,
            model_number TEXT,
            capacity TEXT,
            manufacturer TEXT,
            serial_number TEXT UNIQUE,
            purchase_price REAL,
            poc_number TEXT,
            poc_name TEXT,
            owned_by TEXT,
            subcategory TEXT,
            make TEXT,
            unit TEXT,
            photos TEXT,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        await this.run(`
          INSERT INTO assets_new SELECT 
            id, equipment_name, category, location, asset_type, NULL as client, floor,
            model_number, capacity, manufacturer, serial_number, purchase_price,
            poc_number, poc_name, owned_by, subcategory, make, unit, photos,
            status, created_at, updated_at
          FROM assets
        `);
        
        await this.run('DROP TABLE assets');
        await this.run('ALTER TABLE assets_new RENAME TO assets');
        console.log('Owner column removed from assets table successfully');
      }
    } catch (error) {
      console.error('Error running migrations:', error);
      // Don't throw error to prevent app from crashing
    }
  }

  async insertDefaultData() {
    // Default locations
    const locations = [
      { id: 'loc-1', name: 'Mumbai Office', address: 'Bandra Kurla Complex, Mumbai' },
      { id: 'loc-2', name: 'Delhi Office', address: 'Connaught Place, New Delhi' },
      { id: 'loc-3', name: 'Bangalore Office', address: 'Electronic City, Bangalore' }
    ];

    // Comprehensive categories and subcategories
    const categoryData = [
      // Access Control
      { category: 'Access Control', subcategory: 'Access Controller' },
      { category: 'Access Control', subcategory: 'Access System' },
      { category: 'Access Control', subcategory: 'CCTV' },
      { category: 'Access Control', subcategory: 'NVR' },
      // Battery
      { category: 'Battery', subcategory: 'Battery' },
      // BMS
      { category: 'BMS', subcategory: 'AC Controller' },
      { category: 'BMS', subcategory: 'BMS - Software & Hardware' },
      { category: 'BMS', subcategory: 'Boom Barrier' },
      { category: 'BMS', subcategory: 'CCTV' },
      { category: 'BMS', subcategory: 'Controller' },
      { category: 'BMS', subcategory: 'Flap Barrier' },
      { category: 'BMS', subcategory: 'MLCP' },
      { category: 'BMS', subcategory: 'PA System' },
      { category: 'BMS', subcategory: 'Sliding Door' },
      { category: 'BMS', subcategory: 'Software' },
      { category: 'BMS', subcategory: 'Video Wall' },
      // DG
      { category: 'DG', subcategory: 'DG' },
      { category: 'DG', subcategory: 'Diesel Generator' },
      // Dishwasher
      { category: 'Dishwasher', subcategory: 'Dishwasher' },
      // Drinking Water System
      { category: 'Drinking Water System', subcategory: 'Bubbletop Water Dispenser' },
      { category: 'Drinking Water System', subcategory: 'Drinking Water System' },
      { category: 'Drinking Water System', subcategory: 'RO' },
      { category: 'Drinking Water System', subcategory: 'RO Dispenser' },
      { category: 'Drinking Water System', subcategory: 'RO Machine' },
      { category: 'Drinking Water System', subcategory: 'Water Dispenser' },
      // Electrical
      { category: 'Electrical', subcategory: 'Air Cooler' },
      { category: 'Electrical', subcategory: 'Air Curtain' },
      { category: 'Electrical', subcategory: 'APFC Panel' },
      { category: 'Electrical', subcategory: 'Audio System' },
      { category: 'Electrical', subcategory: 'Automatic Hand Sanitizer' },
      { category: 'Electrical', subcategory: 'Bain Marie' },
      { category: 'Electrical', subcategory: 'Bainmarie' },
      { category: 'Electrical', subcategory: 'Buscoupler' },
      { category: 'Electrical', subcategory: 'Changeover Panel' },
      { category: 'Electrical', subcategory: 'Coffee Machine' },
      { category: 'Electrical', subcategory: 'DB' },
      { category: 'Electrical', subcategory: 'DG Incomer' },
      { category: 'Electrical', subcategory: 'DG Syn Outgoing' },
      { category: 'Electrical', subcategory: 'DG Sync Panel' },
      { category: 'Electrical', subcategory: 'DG-1 Incomer' },
      { category: 'Electrical', subcategory: 'DG-2 Incomer' },
      { category: 'Electrical', subcategory: 'EB Incomer' },
      { category: 'Electrical', subcategory: 'Electrical' },
      { category: 'Electrical', subcategory: 'Electrical Panel' },
      { category: 'Electrical', subcategory: 'Exhaust Fan' },
      { category: 'Electrical', subcategory: 'Fan' },
      { category: 'Electrical', subcategory: 'Flipper Machine' },
      { category: 'Electrical', subcategory: 'Hand Dryer' },
      { category: 'Electrical', subcategory: 'HT Panel' },
      { category: 'Electrical', subcategory: 'HT VCB Panel' },
      { category: 'Electrical', subcategory: 'Inverter' },
      { category: 'Electrical', subcategory: 'LT Kiosk ACB Panel' },
      { category: 'Electrical', subcategory: 'LT Panel' },
      { category: 'Electrical', subcategory: 'Main LT Panel' },
      { category: 'Electrical', subcategory: 'Meter Cubical' },
      { category: 'Electrical', subcategory: 'Microwave' },
      { category: 'Electrical', subcategory: 'Music Systems' },
      { category: 'Electrical', subcategory: 'Pantry' },
      { category: 'Electrical', subcategory: 'Pneumatic Pumps' },
      { category: 'Electrical', subcategory: 'Pump' },
      { category: 'Electrical', subcategory: 'Raw & LTG Panel' },
      { category: 'Electrical', subcategory: 'Refrigerator' },
      { category: 'Electrical', subcategory: 'RMU (SF6 Panel)' },
      { category: 'Electrical', subcategory: 'Submersible Pump' },
      { category: 'Electrical', subcategory: 'Television' },
      { category: 'Electrical', subcategory: 'Transformer' },
      { category: 'Electrical', subcategory: 'Utility Panel' },
      { category: 'Electrical', subcategory: 'Washing Machine' },
      { category: 'Electrical', subcategory: 'Water Tank' },
      // Escalator
      { category: 'Escalator', subcategory: 'Escalator' },
      // FAS
      { category: 'FAS', subcategory: 'Cabinet' },
      { category: 'FAS', subcategory: 'Clean Agent' },
      { category: 'FAS', subcategory: 'FAS' },
      { category: 'FAS', subcategory: 'FAS Main Panel' },
      { category: 'FAS', subcategory: 'FAS Repeater Panel' },
      { category: 'FAS', subcategory: 'Fire Alarm Panel' },
      { category: 'FAS', subcategory: 'Fire Detection' },
      { category: 'FAS', subcategory: 'Fire Extinguisher' },
      { category: 'FAS', subcategory: 'Fire Fighting' },
      { category: 'FAS', subcategory: 'Fire Tank' },
      { category: 'FAS', subcategory: 'GSS' },
      { category: 'FAS', subcategory: 'Hooter' },
      { category: 'FAS', subcategory: 'MCP' },
      { category: 'FAS', subcategory: 'PA System' },
      { category: 'FAS', subcategory: 'Pump' },
      { category: 'FAS', subcategory: 'Rodent Repellent Panel' },
      { category: 'FAS', subcategory: 'Smoke Detector' },
      { category: 'FAS', subcategory: 'Sprinkler' },
      { category: 'FAS', subcategory: 'UG Tanks' },
      { category: 'FAS', subcategory: 'Water Tank' },
      { category: 'FAS', subcategory: 'WLD' },
      // Gym
      { category: 'Gym', subcategory: 'Gym' },
      // HK
      { category: 'HK', subcategory: 'Dustbin' },
      // HK Machine
      { category: 'HK Machine', subcategory: 'HK Machinery' },
      { category: 'HK Machine', subcategory: 'IPC' },
      { category: 'HK Machine', subcategory: 'Single Disc Machine' },
      { category: 'HK Machine', subcategory: 'Single Disc Scrubbing Machine' },
      { category: 'HK Machine', subcategory: 'Vacuum Cleaner' },
      { category: 'HK Machine', subcategory: 'Vacuum' },
      // HVAC
      { category: 'HVAC', subcategory: 'AHU' },
      { category: 'HVAC', subcategory: 'Air Scrubber' },
      { category: 'HVAC', subcategory: 'Air Washer' },
      { category: 'HVAC', subcategory: 'Chiller' },
      { category: 'HVAC', subcategory: 'Cooling Tower' },
      { category: 'HVAC', subcategory: 'Fan' },
      { category: 'HVAC', subcategory: 'Non VRV Outdoor' },
      { category: 'HVAC', subcategory: 'PAC Unit' },
      { category: 'HVAC', subcategory: 'Pump' },
      { category: 'HVAC', subcategory: 'Split AC-Outdoor' },
      { category: 'HVAC', subcategory: 'VRV/VRF Outdoor' },
      // Lift
      { category: 'Lift', subcategory: 'Operation Lift' },
      { category: 'Lift', subcategory: 'Service Lift' },
      // Pumps
      { category: 'Pumps', subcategory: 'Booster Pump' },
      { category: 'Pumps', subcategory: 'Centrifugal Pump' },
      { category: 'Pumps', subcategory: 'Domestic Pump' },
      { category: 'Pumps', subcategory: 'Fire Pump' },
      { category: 'Pumps', subcategory: 'Hydro Pneumatic Pump' },
      { category: 'Pumps', subcategory: 'Jockey Pump' },
      { category: 'Pumps', subcategory: 'Pneumatic Pumps' },
      { category: 'Pumps', subcategory: 'Pump' },
      { category: 'Pumps', subcategory: 'Sewage Pump' },
      { category: 'Pumps', subcategory: 'Sump Pump' },
      { category: 'Pumps', subcategory: 'Water Pump' },
      // STP
      { category: 'STP', subcategory: 'NBR Method' },
      { category: 'STP', subcategory: 'STP' },
      // UPS
      { category: 'UPS', subcategory: 'UPS' },
      // Water Tank
      { category: 'Water Tank', subcategory: 'Flush Tank' },
      { category: 'Water Tank', subcategory: 'Tank' },
      { category: 'Water Tank', subcategory: 'Treated Tank' },
      { category: 'Water Tank', subcategory: 'UG Tanks' }
    ];

    // Convert to hierarchical structure
    const categories = [];
    const categoryMap = new Map();
    let categoryIdCounter = 1;
    let subcategoryIdCounter = 1;

    // First pass: create categories
    for (const item of categoryData) {
      if (!categoryMap.has(item.category)) {
        const categoryId = `cat-${categoryIdCounter++}`;
        categories.push({
          id: categoryId,
          name: item.category,
          parent_id: null
        });
        categoryMap.set(item.category, categoryId);
      }
    }

    // Second pass: create subcategories
    for (const item of categoryData) {
      const parentId = categoryMap.get(item.category);
      categories.push({
        id: `sub-${subcategoryIdCounter++}`,
        name: item.subcategory,
        parent_id: parentId
      });
    }

    try {
      for (const location of locations) {
        await this.run(
          'INSERT OR IGNORE INTO locations (id, name, address) VALUES (?, ?, ?)',
          [location.id, location.name, location.address]
        );
      }

      for (const category of categories) {
        await this.run(
          'INSERT OR IGNORE INTO categories (id, name, parent_id) VALUES (?, ?, ?)',
          [category.id, category.name, category.parent_id]
        );
      }
      
      // Clean up any invalid entries
      await this.cleanupInvalidCategories();
    } catch (error) {
      console.error('Error inserting default data:', error);
    }
  }

  async cleanupInvalidCategories() {
    try {
      // Remove entries with [Object Object] or similar invalid names
      await this.run(
        'DELETE FROM categories WHERE name LIKE "%Object%" OR name = "[object Object]" OR name = "[Object Object]"'
      );
      console.log('Cleaned up invalid category entries');
    } catch (error) {
      console.error('Error cleaning up invalid categories:', error);
    }
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

const database = new Database();
module.exports = database;
