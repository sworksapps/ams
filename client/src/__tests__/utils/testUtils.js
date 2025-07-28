import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ReactKeycloakProvider } from '@react-keycloak/web';
import '@testing-library/jest-dom';

// Mock ScrollProvider since it's required by Dashboard
const MockScrollProvider = ({ children }) => {
  const mockScrollContext = {
    saveScrollPosition: jest.fn(),
    getScrollPosition: jest.fn(() => 0),
    restoreScrollPosition: jest.fn()
  };
  
  return React.createElement(
    'div',
    { 'data-testid': 'scroll-provider' },
    children
  );
};

// Mock the ScrollContext
jest.mock('../../contexts/ScrollContext', () => ({
  ScrollProvider: MockScrollProvider,
  useScrollState: () => ({
    saveScrollPosition: jest.fn(),
    getScrollPosition: jest.fn(() => 0),
    restoreScrollPosition: jest.fn()
  })
}));

// Setup global mocks
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Keycloak instance for testing
export const mockKeycloak = {
  init: jest.fn(() => Promise.resolve(true)),
  login: jest.fn(),
  logout: jest.fn(),
  authenticated: true,
  token: 'mock-token',
  tokenParsed: {
    sub: 'mock-user-id',
    preferred_username: 'testuser',
    name: 'Test User',
    email: 'test@example.com'
  },
  hasRealmRole: jest.fn(() => true),
  hasResourceRole: jest.fn(() => true),
  updateToken: jest.fn(() => Promise.resolve(true))
};

// Custom render function with providers
export const renderWithProviders = (ui, options = {}) => {
  const { initialEntries = ['/'], ...renderOptions } = options;

  // Simplified wrapper to avoid appendChild errors
  const AllTheProviders = ({ children }) => {
    return (
      <BrowserRouter>
        <ReactKeycloakProvider authClient={mockKeycloak}>
          <MockScrollProvider>
            <div data-testid="test-wrapper">
              {children}
            </div>
          </MockScrollProvider>
        </ReactKeycloakProvider>
      </BrowserRouter>
    );
  };

  return render(ui, {
    wrapper: AllTheProviders,
    ...renderOptions
  });
};

// Mock API responses
export const mockApiResponses = {
  assets: {
    success: {
      data: [
        {
          id: 1,
          equipment_name: 'Test Equipment 1',
          serial_number: 'SN001',
          category: 'HVAC',
          location: 'Mumbai - Andheri',
          manufacturer: 'Test Manufacturer',
          model: 'Model A',
          coverage_status: 'Active'
        },
        {
          id: 2,
          equipment_name: 'Test Equipment 2',
          serial_number: 'SN002',
          category: 'Electrical',
          location: 'Delhi - CP',
          manufacturer: 'Test Manufacturer 2',
          model: 'Model B',
          coverage_status: 'Expired'
        }
      ],
      total: 2
    },
    error: {
      response: {
        status: 500,
        data: { message: 'Internal Server Error' }
      }
    }
  },
  locations: {
    success: {
      data: [
        { id: 1, name: 'Mumbai - Andheri' },
        { id: 2, name: 'Delhi - CP' },
        { id: 3, name: 'Bangalore - Whitefield' }
      ]
    }
  },
  categories: {
    success: {
      data: [
        { id: 1, name: 'HVAC' },
        { id: 2, name: 'Electrical' },
        { id: 3, name: 'Plumbing' }
      ]
    }
  },
  dashboard: {
    success: {
      data: {
        totalAssets: 2847,
        activeRepairs: 23,
        ppmCompliance: 94.2,
        amcCoverage: 78.5,
        breakdowns: 5,
        overduePPM: 11,
        expiredAMC: 39
      }
    }
  },
  ppmTasks: {
    success: {
      data: {
        tasks: [
          {
            id: 1,
            task_name: 'Monthly HVAC Check',
            asset_name: 'AC Unit 1',
            location: 'Mumbai - Andheri',
            status: 'Open',
            due_date: '2024-02-15',
            priority: 'High'
          }
        ],
        totalCount: 1,
        kpis: {
          total: 150,
          open: 45,
          critical: 12,
          pastDue: 8,
          closed: 85
        }
      }
    }
  },
  maintenanceSchedules: {
    success: {
      data: [
        {
          id: 1,
          asset_id: 101,
          equipment_name: 'AC Unit 1',
          location: 'Mumbai - Andheri',
          category: 'HVAC',
          subcategory: 'Air Conditioning',
          maintenance_name: 'Monthly Filter Check',
          start_date: '2024-01-01',
          frequency: 'monthly',
          frequency_value: 1,
          owner: 'SW',
          is_active: 1
        },
        {
          id: 2,
          asset_id: 102,
          equipment_name: 'Generator 1',
          location: 'Delhi - CP',
          category: 'Electrical',
          subcategory: 'Power Generation',
          maintenance_name: 'Weekly Oil Check',
          start_date: '2024-01-01',
          frequency: 'weekly',
          frequency_value: 1,
          owner: 'Vendor',
          is_active: 1
        }
      ]
    }
  },
  amcRenewals: {
    success: {
      data: {
        tickets: [
          {
            id: 1,
            ticket_number: 'AMC001',
            asset_name: 'Test Equipment',
            location: 'Mumbai - Andheri',
            status: 'Open',
            expiry_date: '2024-03-15'
          }
        ],
        total: 1,
        kpis: {
          total: 100,
          open: 25,
          critical: 5,
          pastDue: 3,
          closed: 67
        }
      }
    }
  }
};

// Mock form data
export const mockFormData = {
  asset: {
    equipment_name: 'Test Equipment',
    serial_number: 'TEST001',
    category: 'HVAC',
    location: 'Mumbai - Andheri',
    manufacturer: 'Test Manufacturer',
    model: 'Test Model',
    capacity: '5 Ton',
    floor: '2nd Floor',
    purchase_price: 50000,
    owned_by: 'Company',
    poc_name: 'John Doe',
    poc_contact: '9876543210'
  },
  coverage: {
    vendor_name: 'Test Vendor',
    amc_type: 'Comprehensive',
    po_number: 'PO001',
    po_amount: 25000,
    start_date: '2024-01-01',
    end_date: '2024-12-31'
  },
  schedule: {
    maintenance_name: 'Monthly Check',
    start_date: '2024-01-01',
    frequency: 'Monthly'
  }
};

// Utility functions for testing
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 100));

export const createMockEvent = (value) => ({
  target: { value },
  preventDefault: jest.fn(),
  stopPropagation: jest.fn()
});

export const createMockFile = (name = 'test.jpg', type = 'image/jpeg') => 
  new File(['test content'], name, { type });

// Mock intersection observer entries
export const createMockIntersectionObserverEntry = (isIntersecting = true) => ({
  isIntersecting,
  target: document.createElement('div'),
  boundingClientRect: {},
  intersectionRatio: isIntersecting ? 1 : 0,
  intersectionRect: {},
  rootBounds: {},
  time: Date.now()
});

// Helper to flush promises
export const flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Mock API modules
jest.mock('../../utils/api', () => ({
  maintenanceAPI: {
    getSchedules: jest.fn(() => Promise.resolve(mockResponses.maintenanceSchedules.success)),
    createSchedule: jest.fn(() => Promise.resolve({ success: true, data: { id: 3 } })),
    updateSchedule: jest.fn(() => Promise.resolve({ success: true })),
    deleteSchedule: jest.fn(() => Promise.resolve({ success: true })),
    generatePPMTasksAdminMode: jest.fn(() => Promise.resolve({ success: true, message: 'Tasks generated successfully' }))
  },
  assetsAPI: {
    getAssets: jest.fn(() => Promise.resolve(mockResponses.assets.success)),
    createAsset: jest.fn(() => Promise.resolve({ success: true, data: { id: 3 } })),
    updateAsset: jest.fn(() => Promise.resolve({ success: true })),
    deleteAsset: jest.fn(() => Promise.resolve({ success: true }))
  },
  categoriesAPI: {
    getCategories: jest.fn(() => Promise.resolve(mockResponses.categories.success)),
    getSubcategories: jest.fn(() => Promise.resolve({ data: [] }))
  },
  dashboardAPI: {
    getDashboardData: jest.fn(() => Promise.resolve(mockResponses.dashboard.success))
  },
  ppmAPI: {
    getTasks: jest.fn(() => Promise.resolve(mockResponses.ppmTasks.success))
  },
  amcAPI: {
    getRenewals: jest.fn(() => Promise.resolve(mockResponses.amcRenewals.success))
  },
  locationsAPI: {
    getLocations: jest.fn(() => Promise.resolve(mockResponses.locations.success))
  }
}));
