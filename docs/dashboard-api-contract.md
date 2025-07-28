# Dashboard API Contract Specification

## Overview
This document defines the API contract for the Enterprise Asset Management Dashboard. The dashboard integrates data from multiple sources:
- **Asset Management**: Internal database (existing)
- **PPM Tasks**: External ticketing API (existing integration)
- **Repairs & Maintenance**: External ticketing API (existing integration)
- **AMC Coverage**: Internal database (existing)

## Required API Endpoints

### 1. Dashboard Summary Data
**Endpoint**: `GET /api/dashboard/summary`
**Purpose**: Fetch multi-location summary data for the main dashboard table

#### Request Parameters
```json
{
  "locations": ["all"] | ["location1", "location2", ...], // Optional filter
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "id": "loc_001",
        "location": "Mumbai HQ",
        "locationCode": "MUM",
        "assets": {
          "total": 245,
          "active": 240,
          "inactive": 5
        },
        "repairs": {
          "open": 12,
          "breakdowns": 3,
          "critical": 2
        },
        "ppm": {
          "totalSchedules": 45,
          "openTasks": 8,
          "overdueTasks": 2
        },
        "amc": {
          "active": 180,
          "expiringSoon": 15,
          "expired": 8,
          "noCoverage": 42
        }
      }
    ],
    "totals": {
      "assets": 1250,
      "openRepairs": 45,
      "breakdowns": 12,
      "activeAMC": 890,
      "expiringSoonAMC": 67,
      "expiredAMC": 23,
      "noCoverageAMC": 270,
      "totalSchedules": 234,
      "openPPMTasks": 34,
      "overduePPMTasks": 8
    }
  }
}
```

### 2. Location Category Breakdown (Drill-down Data)
**Endpoint**: `GET /api/dashboard/location/{locationId}/categories`
**Purpose**: Fetch category-level breakdown for drill-down functionality

#### Response Format
```json
{
  "success": true,
  "data": {
    "locationId": "loc_001",
    "locationName": "Mumbai HQ",
    "categories": [
      {
        "categoryId": "cat_hvac",
        "categoryName": "HVAC Systems",
        "assetCount": 45,
        "repairs": {
          "open": 3,
          "breakdowns": 1,
          "critical": 1
        },
        "ppm": {
          "openTasks": 4,
          "overdueTasks": 1,
          "scheduledTasks": 12
        },
        "amc": {
          "active": 35,
          "expiringSoon": 2,
          "expired": 1,
          "noCoverage": 7
        }
      },
      {
        "categoryId": "cat_electrical",
        "categoryName": "Electrical Systems",
        "assetCount": 78,
        "repairs": {
          "open": 2,
          "breakdowns": 0,
          "critical": 0
        },
        "ppm": {
          "openTasks": 6,
          "overdueTasks": 0,
          "scheduledTasks": 18
        },
        "amc": {
          "active": 68,
          "expiringSoon": 3,
          "expired": 2,
          "noCoverage": 5
        }
      }
    ]
  }
}
```

### 3. Individual Asset Lifecycle Data
**Endpoint**: `GET /api/assets/{assetId}/lifecycle`
**Purpose**: Fetch comprehensive lifecycle data for individual asset view

#### Response Format
```json
{
  "success": true,
  "data": {
    "assetId": "asset_001",
    "assetName": "Central AC Unit #1",
    "location": "Mumbai HQ",
    "category": "HVAC Systems",
    "repairs": {
      "active": [
        {
          "ticketId": "REP_001",
          "title": "AC not cooling properly",
          "status": "In Progress",
          "priority": "High",
          "createdDate": "2024-01-15",
          "assignedTo": "John Doe",
          "estimatedCompletion": "2024-01-20"
        }
      ],
      "history": [
        {
          "ticketId": "REP_002",
          "title": "Filter replacement",
          "status": "Completed",
          "completedDate": "2024-01-10",
          "cost": 1500
        }
      ],
      "summary": {
        "totalRepairs": 12,
        "totalCost": 45000,
        "avgResolutionTime": "3.2 days",
        "lastRepairDate": "2024-01-15"
      }
    },
    "ppm": {
      "activeTasks": [
        {
          "taskId": "PPM_001",
          "title": "Quarterly AC Maintenance",
          "dueDate": "2024-01-25",
          "status": "Scheduled",
          "assignedTo": "Maintenance Team A"
        }
      ],
      "schedule": {
        "frequency": "Quarterly",
        "nextDue": "2024-04-25",
        "lastCompleted": "2023-10-25"
      },
      "history": [
        {
          "taskId": "PPM_002",
          "title": "Quarterly AC Maintenance",
          "completedDate": "2023-10-25",
          "status": "Completed"
        }
      ]
    },
    "amc": {
      "current": {
        "contractId": "AMC_001",
        "vendor": "Cool Air Services",
        "startDate": "2023-04-01",
        "endDate": "2024-03-31",
        "status": "Active",
        "coverageType": "Comprehensive",
        "annualValue": 25000
      },
      "renewals": [
        {
          "renewalId": "REN_001",
          "dueDate": "2024-03-31",
          "status": "Pending",
          "estimatedCost": 27000,
          "vendor": "Cool Air Services"
        }
      ],
      "history": [
        {
          "contractId": "AMC_002",
          "period": "2022-04-01 to 2023-03-31",
          "vendor": "Cool Air Services",
          "finalCost": 24000
        }
      ]
    }
  }
}
```

## Data Integration Points

### Internal Data Sources (Already Available)
1. **Assets**: Asset master data, locations, categories
2. **AMC Contracts**: Coverage details, renewal schedules
3. **Users & Authentication**: Keycloak integration

### External API Integration (Existing)
1. **PPM Tasks**: External ticketing system for preventive maintenance
2. **Repairs**: External ticketing system for reactive maintenance

### New Integration Requirements
1. **Dashboard Aggregation Service**: New microservice to aggregate data from all sources
2. **Caching Layer**: Redis cache for dashboard performance (recommended)
3. **Real-time Updates**: WebSocket or polling for live data updates

## Implementation Notes

### Mock Data Structure (Current Implementation)
The current dashboard uses static mock data. Replace the following functions with API calls:

1. `locationSummary` array → Call `/api/dashboard/summary`
2. `getDrillDownData()` function → Call `/api/dashboard/location/{id}/categories`
3. Individual asset views → Call `/api/assets/{id}/lifecycle`

### Performance Considerations
- Implement caching for dashboard summary data (5-minute TTL recommended)
- Use pagination for drill-down data if categories exceed 20 items
- Consider real-time updates for critical metrics (breakdowns, overdue tasks)

### Error Handling
All endpoints should return consistent error format:
```json
{
  "success": false,
  "error": {
    "code": "DASHBOARD_001",
    "message": "Failed to fetch location summary",
    "details": "External API timeout"
  }
}
```

### Authentication
All dashboard APIs should use the existing Keycloak token authentication.

## Migration Path
1. **Phase 1**: Implement dashboard summary API with mock external data
2. **Phase 2**: Integrate with existing external ticketing APIs
3. **Phase 3**: Add real-time updates and caching
4. **Phase 4**: Implement advanced analytics and trending
