# Asset Management System

A comprehensive Asset Management System for central administrators to manage assets, maintenance schedules, coverage contracts, and repair tickets across multiple locations.

## Features

### 🏢 **Comprehensive Dashboard**
- Executive overview with KPIs and alerts
- Assets by location with drill-down capabilities
- Expiring contracts and recent tickets overview

### 📦 **Asset Management**
- Complete asset inventory with detailed information
- Asset onboarding with mandatory fields
- Photo uploads and document management
- Location and category-based organization

### 🔧 **Preventive Maintenance (PPM)**
- Automated maintenance scheduling
- Task tracking and assignment
- Overdue alerts and compliance monitoring
- Customizable maintenance frequencies

### 🛡️ **Coverage Management**
- AMC and warranty tracking
- Contract renewal management
- Expiry notifications and alerts
- Vendor and service type management

### 🎫 **Repair & Maintenance Tickets**
- Comprehensive ticketing system
- Priority-based SLA management
- Assignment and tracking workflows
- Status updates and resolution tracking

## Technology Stack

- **Frontend**: React 18, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: SQLite with comprehensive schema
- **File Handling**: Multer for photo/document uploads
- **Date Management**: date-fns for date formatting

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm run install-all
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Alternative: Start services separately

**Backend**:
```bash
npm run server
```

**Frontend**:
```bash
npm run client
```

## Project Structure

```
asset-management-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Main application pages
│   │   ├── utils/         # API utilities
│   │   └── index.js       # Application entry point
│   └── public/            # Static assets
├── server/                # Node.js backend
│   ├── routes/           # API route handlers
│   ├── database.js       # Database configuration
│   └── index.js          # Server entry point
└── uploads/              # File upload directory
```

## API Endpoints

### Assets
- `GET /api/assets` - Get all assets with filters
- `POST /api/assets` - Create new asset
- `GET /api/assets/:id` - Get asset details
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Maintenance
- `GET /api/maintenance/dashboard` - PPM dashboard data
- `GET /api/maintenance/tasks` - Get PPM tasks
- `PUT /api/maintenance/tasks/:id` - Update task status

### Coverage
- `GET /api/coverage` - Get coverage records
- `POST /api/coverage` - Create coverage
- `POST /api/coverage/:id/renew` - Renew coverage

### Tickets
- `GET /api/tickets` - Get all tickets
- `POST /api/tickets` - Create ticket
- `POST /api/tickets/:id/assign` - Assign ticket
- `POST /api/tickets/:id/close` - Close ticket

### Dashboard
- `GET /api/dashboard` - Comprehensive dashboard data
- `GET /api/dashboard/assets` - Asset dashboard summary

## Key Features Implementation

### Asset Onboarding
All mandatory fields as per requirements:
- Equipment name, category, location
- Building/client asset classification
- Technical specifications (model, capacity, manufacturer, serial)
- Purchase information (price, POC details)
- Ownership and categorization details
- Photo uploads

### Maintenance Scheduling
- Optional multiple schedules per asset
- Configurable frequencies (daily, weekly, monthly, quarterly, yearly)
- Automatic task generation
- Overdue tracking and alerts

### Coverage Management
- AMC and warranty tracking
- Comprehensive vendor information
- PO and financial details
- Expiry monitoring with configurable alerts
- Renewal workflow

### Dashboard Analytics
- Real-time KPIs and metrics
- Location-based asset distribution
- Coverage status overview
- Maintenance compliance tracking
- Ticket performance monitoring

## Database Schema

The system uses SQLite with the following main tables:
- `assets` - Core asset information
- `maintenance_schedules` - Maintenance scheduling
- `coverage` - AMC/warranty coverage
- `ppm_tasks` - Preventive maintenance tasks
- `rm_tickets` - Repair & maintenance tickets
- `locations` - Location master data
- `categories` - Category master data

## Security & Best Practices

- Input validation and sanitization
- File upload restrictions and validation
- SQL injection prevention
- Error handling and logging
- Responsive design for multiple devices
- Clean, intuitive UI with consistent navigation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For support and questions, please refer to the documentation or contact the development team.

---

**Asset Management System** - Streamlining asset lifecycle management for organizations.
