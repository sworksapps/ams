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
      // Check if locations already exist
      const locationCount = await this.prisma.location.count();
      if (locationCount === 0) {
        console.log('Inserting default locations...');
        await this.insertDefaultLocations();
      }

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

  async insertDefaultLocations() {
    const locations = [
      { id: 'loc-1', name: 'Building A', address: 'Main Campus, Floor 1-5' },
      { id: 'loc-2', name: 'Building B', address: 'Main Campus, Floor 1-3' },
      { id: 'loc-3', name: 'Building C', address: 'Main Campus, Floor 1-4' },
      { id: 'loc-4', name: 'Data Center', address: 'Basement Level' },
      { id: 'loc-5', name: 'Parking Area', address: 'Ground Level' },
      { id: 'loc-6', name: 'Rooftop', address: 'Top Level' }
    ];

    for (const location of locations) {
      await this.prisma.location.upsert({
        where: { id: location.id },
        update: {},
        create: location
      });
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
    return await this.prisma.asset.create({
      data: assetData,
      include: {
        maintenanceSchedules: true,
        coverage: true,
        tickets: true
      }
    });
  }

  async getAssetById(id) {
    return await this.prisma.asset.findUnique({
      where: { id },
      include: {
        maintenanceSchedules: true,
        coverage: true,
        tickets: true
      }
    });
  }

  async getAllAssets(filters = {}) {
    const where = {};
    
    if (filters.category) where.category = filters.category;
    if (filters.location) where.location = filters.location;
    if (filters.status) where.status = filters.status;
    if (filters.assetType) where.assetType = filters.assetType;

    return await this.prisma.asset.findMany({
      where,
      include: {
        maintenanceSchedules: true,
        coverage: true,
        tickets: true
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
        coverage: true,
        tickets: true
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

  // Ticket operations
  async createTicket(ticketData) {
    return await this.prisma.ticket.create({
      data: ticketData,
      include: { asset: true }
    });
  }

  async getTickets(filters = {}) {
    const where = {};
    
    if (filters.assetId) where.assetId = filters.assetId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;

    return await this.prisma.ticket.findMany({
      where,
      include: { asset: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateTicket(id, updateData) {
    return await this.prisma.ticket.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: { asset: true }
    });
  }

  async deleteTicket(id) {
    return await this.prisma.ticket.delete({
      where: { id }
    });
  }

  // Location operations
  async getLocations() {
    return await this.prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async createLocation(locationData) {
    return await this.prisma.location.create({
      data: locationData
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
