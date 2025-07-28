const db = require('./database');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    await db.init();
    console.log('✅ Database initialized successfully');
    
    // Test a simple query
    const result = await new Promise((resolve, reject) => {
      db.db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('✅ Database tables:', result.map(r => r.name));
    
    // Test assets table
    const assets = await new Promise((resolve, reject) => {
      db.db.all("SELECT COUNT(*) as count FROM assets", (err, rows) => {
        if (err) reject(err);
        else resolve(rows[0].count);
      });
    });
    
    console.log('✅ Assets count:', assets);
    
    // Test external location service
    try {
      const CentralLocationService = require('./utils/centralLocationService');
      const locationResult = await CentralLocationService.fetchLocations();
      if (locationResult.success) {
        console.log('✅ External locations service working, found', locationResult.data.length, 'locations');
      } else {
        console.log('⚠️ External locations service error:', locationResult.error);
      }
    } catch (error) {
      console.log('⚠️ External locations service not available:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

testDatabase();
