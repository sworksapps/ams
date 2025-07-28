const { PrismaClient } = require('@prisma/client');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async init() {
    try {
      // Test the connection
      await this.prisma.$connect();
      console.log('Connected to PostgreSQL database via Prisma');
      
      // Insert default data if tables are empty
      await this.insertDefaultData();
      
      return true;
    } catch (error) {
      console.error('Error connecting to database:', error);
      throw error;
    }
  }

  async insertDefaultData() {
    try {
      // Check if categories already exist
      const categoryCount = await this.prisma.category.count();
      if (categoryCount === 0) {
        console.log('Inserting default categories...');
        await this.insertDefaultCategories();
      }

      console.log('Default data insertion completed');
    } catch (error) {
      console.error('Error inserting default data:', error);
    }
  }



  async insertDefaultCategories() {
    const categoryData = [
      // Air Conditioner
      { category: 'Air Conditioner', subcategory: 'Cassette AC' },
      { category: 'Air Conditioner', subcategory: 'Ductable AC' },
      { category: 'Air Conditioner', subcategory: 'Package AC' },
      { category: 'Air Conditioner', subcategory: 'Split AC' },
      { category: 'Air Conditioner', subcategory: 'VRF' },
      { category: 'Air Conditioner', subcategory: 'Window AC' },
      // Boiler
      { category: 'Boiler', subcategory: 'Boiler' },
      // Chiller
      { category: 'Chiller', subcategory: 'Air Cooled Chiller' },
      { category: 'Chiller', subcategory: 'Chiller' },
      { category: 'Chiller', subcategory: 'Water Cooled Chiller' },
      // DG Set
      { category: 'DG Set', subcategory: 'DG Set' },
      // Electrical
      { category: 'Electrical', subcategory: 'APFC Panel' },
      { category: 'Electrical', subcategory: 'Capacitor Bank' },
      { category: 'Electrical', subcategory: 'Control Panel' },
      { category: 'Electrical', subcategory: 'Distribution Board' },
      { category: 'Electrical', subcategory: 'Electrical Panel' },
      { category: 'Electrical', subcategory: 'HT Panel' },
      { category: 'Electrical', subcategory: 'LT Panel' },
      { category: 'Electrical', subcategory: 'Main Panel' },
      { category: 'Electrical', subcategory: 'MCC Panel' },
      { category: 'Electrical', subcategory: 'PCC Panel' },
      { category: 'Electrical', subcategory: 'Power Panel' },
      { category: 'Electrical', subcategory: 'Sub Panel' },
      { category: 'Electrical', subcategory: 'Transformer' },
      { category: 'Electrical', subcategory: 'VFD' },
      // Fire Safety
      { category: 'Fire Safety', subcategory: 'Fire Alarm Panel' },
      { category: 'Fire Safety', subcategory: 'Fire Extinguisher' },
      { category: 'Fire Safety', subcategory: 'Fire Hydrant System' },
      { category: 'Fire Safety', subcategory: 'Fire Sprinkler System' },
      { category: 'Fire Safety', subcategory: 'Smoke Detector' },
      // Generator
      { category: 'Generator', subcategory: 'Generator' },
      // HVAC
      { category: 'HVAC', subcategory: 'AHU' },
      { category: 'HVAC', subcategory: 'Exhaust Fan' },
      { category: 'HVAC', subcategory: 'FCU' },
      { category: 'HVAC', subcategory: 'Fresh Air Unit' },
      { category: 'HVAC', subcategory: 'HVAC System' },
      // Lift
      { category: 'Lift', subcategory: 'Goods Lift' },
      { category: 'Lift', subcategory: 'Passenger Lift' },
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
    const categoryMap = new Map();
    let categoryIdCounter = 1;
    let subcategoryIdCounter = 1;

    // First pass: create parent categories
    for (const item of categoryData) {
      if (!categoryMap.has(item.category)) {
        const categoryId = `cat-${categoryIdCounter++}`;
        await this.prisma.category.upsert({
          where: { id: categoryId },
          update: {},
          create: {
            id: categoryId,
            name: item.category,
            parentId: null
          }
        });
        categoryMap.set(item.category, categoryId);
      }
    }

    // Second pass: create subcategories
    for (const item of categoryData) {
      const parentId = categoryMap.get(item.category);
      const subcategoryId = `sub-${subcategoryIdCounter++}`;
      
      await this.prisma.category.upsert({
        where: { id: subcategoryId },
        update: {},
        create: {
          id: subcategoryId,
          name: item.subcategory,
          parentId: parentId
        }
      });
    }
  }

  // Asset operations
  async createAsset(assetData) {
    // Map API values to Prisma enum values
    const mappedData = { ...assetData };
    
    console.log('Original assetData:', JSON.stringify(assetData, null, 2));
    
    // Map asset_type from API format to Prisma enum
    if (mappedData.asset_type === 'Building asset') {
      mappedData.assetType = 'building';
    } else if (mappedData.asset_type === 'Client asset') {
      mappedData.assetType = 'client';
    }
    delete mappedData.asset_type; // Remove the original field
    
    console.log('After asset_type mapping:', JSON.stringify(mappedData, null, 2));
    
    // Map owned_by to ownedBy and ensure it's a valid value
    if (mappedData.owned_by) {
      mappedData.ownedBy = mappedData.owned_by;
      delete mappedData.owned_by;
    }
    
    // Map other snake_case fields to camelCase for Prisma
    if (mappedData.equipment_name) {
      mappedData.equipmentName = mappedData.equipment_name;
      delete mappedData.equipment_name;
    }
    if (mappedData.location_name) {
      mappedData.locationName = mappedData.location_name;
      delete mappedData.location_name;
    }
    if (mappedData.model_number) {
      mappedData.modelNumber = mappedData.model_number;
      delete mappedData.model_number;
    }
    if (mappedData.serial_number) {
      mappedData.serialNumber = mappedData.serial_number;
      delete mappedData.serial_number;
    }
    if (mappedData.purchase_price) {
      mappedData.purchasePrice = mappedData.purchase_price;
      delete mappedData.purchase_price;
    }
    if (mappedData.poc_number) {
      mappedData.pocNumber = mappedData.poc_number;
      delete mappedData.poc_number;
    }
    if (mappedData.poc_name) {
      mappedData.pocName = mappedData.poc_name;
      delete mappedData.poc_name;
    }
    
    // Generate ID if not provided
    if (!mappedData.id) {
      mappedData.id = require('uuid').v4();
    }
    
    console.log('Final mappedData before Prisma call:', JSON.stringify(mappedData, null, 2));
    console.log('assetType value:', mappedData.assetType);
    
    return await this.prisma.asset.create({
      data: mappedData,
      include: {
        maintenanceSchedules: true,
        coverage: true
      }
    });
  }

  async getAssetById(id) {
    return await this.prisma.asset.findUnique({
      where: { id },
      include: {
        maintenanceSchedules: true,
        coverage: true
      }
    });
  }

  async getAllAssets(filters = {}) {
    const where = {};
    
    if (filters.category) where.category = filters.category;
    if (filters.location) where.location = filters.location;
    if (filters.status) where.status = filters.status;
    if (filters.assetType) where.assetType = filters.assetType;

    // Only show active and inactive assets by default (exclude maintenance status if not specifically requested)
    if (!filters.status) {
      where.status = { in: ['active', 'inactive'] };
    }

    return await this.prisma.asset.findMany({
      where,
      include: {
        maintenanceSchedules: true,
        coverage: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateAsset(id, updateData) {
    return await this.prisma.asset.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        maintenanceSchedules: true,
        coverage: true
      }
    });
  }

  async deleteAsset(id) {
    return await this.prisma.asset.delete({
      where: { id }
    });
  }

  // Maintenance Schedule operations
  async createMaintenanceSchedule(scheduleData) {
    return await this.prisma.maintenanceSchedule.create({
      data: scheduleData,
      include: { asset: true }
    });
  }

  async getMaintenanceSchedules(assetId = null) {
    const where = assetId ? { assetId } : {};
    return await this.prisma.maintenanceSchedule.findMany({
      where,
      include: { asset: true },
      orderBy: { startDate: 'asc' }
    });
  }

  async updateMaintenanceSchedule(id, updateData) {
    return await this.prisma.maintenanceSchedule.update({
      where: { id },
      data: updateData,
      include: { asset: true }
    });
  }

  async deleteMaintenanceSchedule(id) {
    return await this.prisma.maintenanceSchedule.delete({
      where: { id }
    });
  }

  // Coverage operations
  async createCoverage(coverageData) {
    return await this.prisma.coverage.create({
      data: coverageData,
      include: { asset: true }
    });
  }

  async getCoverage(assetId = null) {
    const where = assetId ? { assetId } : {};
    return await this.prisma.coverage.findMany({
      where,
      include: { asset: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateCoverage(id, updateData) {
    return await this.prisma.coverage.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: { asset: true }
    });
  }

  async deleteCoverage(id) {
    return await this.prisma.coverage.delete({
      where: { id }
    });
  }





  // Category operations
  async getCategories() {
    return await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        parent: true,
        children: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async getCategoriesHierarchy() {
    const categories = await this.prisma.category.findMany({
      where: { 
        isActive: true,
        parentId: null // Get only parent categories
      },
      include: {
        children: {
          where: { isActive: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return categories;
  }

  async createCategory(categoryData) {
    return await this.prisma.category.create({
      data: categoryData
    });
  }

  // Generic query methods for backward compatibility
  async run(sql, params = []) {
    // This method is for raw SQL queries if needed
    return await this.prisma.$executeRaw`${sql}`;
  }

  async get(sql, params = []) {
    // This method is for raw SQL queries if needed
    return await this.prisma.$queryRaw`${sql}`;
  }

  async all(sql, params = []) {
    // This method is for raw SQL queries if needed
    return await this.prisma.$queryRaw`${sql}`;
  }

  async close() {
    await this.prisma.$disconnect();
    console.log('Disconnected from PostgreSQL database');
  }

  // Health check method
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message, timestamp: new Date() };
    }
  }
}

const database = new DatabaseService();
module.exports = database;
