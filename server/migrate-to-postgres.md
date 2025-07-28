# Migration Guide: SQLite to PostgreSQL with Prisma

## Overview
This guide helps you complete the migration from SQLite to PostgreSQL using Prisma ORM with your AWS RDS instance.

## Prerequisites
- AWS RDS PostgreSQL instance running and accessible
- Database credentials (username, password, endpoint, port, database name)

## Step 1: Configure Environment Variables

Create or update your `.env` file in the server directory with your AWS RDS PostgreSQL connection string:

```bash
# Database Configuration (PostgreSQL with AWS RDS)
DATABASE_URL="postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/asset_management?schema=public"

# Server Configuration
PORT=5000
NODE_ENV=development

# Keycloak Configuration (for backend service-to-service authentication)
KEYCLOAK_URL=https://auth-uat.sworks.co.in
KEYCLOAK_REALM=pre-prod
KEYCLOAK_CLIENT_ID=your-backend-service-client-id
KEYCLOAK_CLIENT_SECRET=your-backend-service-client-secret

# External API Configuration
EXTERNAL_API_TIMEOUT=30000

# External Services Base URLs
EXTERNAL_TICKETING_BASE_URL=https://api-uat.sworks.co.in/tickets
EXTERNAL_LOCATION_BASE_URL=https://api-uat.sworks.co.in/bms/api/v1/client

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

## Step 2: Database Setup

1. **Push the schema to your PostgreSQL database:**
   ```bash
   npm run db:push
   ```

2. **Generate Prisma client (if not already done):**
   ```bash
   npm run db:generate
   ```

3. **Optional: Create a migration file for version control:**
   ```bash
   npm run db:migrate
   ```

## Step 3: Test the Migration

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Check the health endpoint:**
   ```bash
   curl http://localhost:5000/api/health
   ```

## What Changed

### Dependencies
- ✅ Added: `@prisma/client`, `prisma`, `pg`
- ❌ Removed: `sqlite3`

### Database Layer
- ✅ New: `database.js` - Prisma-based database service
- 📁 Backup: `database-sqlite-backup.js` - Original SQLite implementation

### Schema
- ✅ New: `prisma/schema.prisma` - Complete database schema with relationships
- 🔄 Enhanced: Better type safety and relationships between entities

### Features Added
- ✅ Type-safe database operations with Prisma
- ✅ Better relationship handling (foreign keys, cascading deletes)
- ✅ Enhanced query capabilities
- ✅ Database health check endpoint
- ✅ Automatic default data seeding

## Database Schema Overview

The new PostgreSQL schema includes:

### Core Tables
- **assets** - Main asset information with enhanced fields
- **maintenance_schedules** - Preventive maintenance scheduling
- **coverage** - AMC/Warranty information
- **tickets** - Issue tracking and resolution
- **locations** - Asset location management
- **categories** - Hierarchical category system

### Enums for Data Integrity
- AssetType: building, client
- Owner: SW, Vendor
- AssetStatus: active, inactive, maintenance
- CoverageType: AMC, Warranty, Not Applicable
- CoverageStatus: active, expired, renewed
- TicketPriority: low, medium, high, critical
- TicketStatus: open, in_progress, resolved, closed, cancelled

## Troubleshooting

### Connection Issues
1. Verify your AWS RDS instance is running and accessible
2. Check security groups allow connections from your IP
3. Verify the DATABASE_URL format is correct
4. Test connection with a PostgreSQL client

### Migration Issues
1. If `db:push` fails, check the database exists and user has proper permissions
2. For schema conflicts, you may need to drop and recreate the database
3. Check Prisma logs for detailed error information

### Data Migration (if needed)
If you need to migrate existing SQLite data:
1. Export data from SQLite using the backup database file
2. Transform data format to match new schema
3. Import using Prisma client or SQL scripts

## Performance Considerations
- PostgreSQL offers better performance for complex queries
- Indexes are automatically created for primary keys and unique constraints
- Consider adding custom indexes for frequently queried fields
- Use connection pooling for production deployments

## Next Steps
1. Update your DATABASE_URL in the .env file
2. Run the database setup commands
3. Test all API endpoints
4. Update any remaining SQLite-specific code in routes
5. Deploy to your production environment
