import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockApiResponses } from '../utils/testUtils';
import Dashboard from '../../pages/Dashboard';
import * as api from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api');
const mockAPI = api;

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    mockAPI.dashboardAPI = {
      getKPIs: jest.fn().mockResolvedValue(mockApiResponses.dashboard.success.data),
      getLocationSummary: jest.fn().mockResolvedValue([
        {
          location: 'Mumbai - Andheri',
          totalAssets: 450,
          openRepairs: 12,
          breakdowns: 2,
          activeAMC: 380,
          expiringSoonAMC: 25,
          expiredAMC: 15,
          noCoverageAMC: 30,
          maintenanceSchedules: 85,
          openPPM: 18,
          overduePPM: 3,
          totalCoverages: 420
        },
        {
          location: 'Delhi - CP',
          totalAssets: 320,
          openRepairs: 8,
          breakdowns: 1,
          activeAMC: 280,
          expiringSoonAMC: 15,
          expiredAMC: 10,
          noCoverageAMC: 15,
          maintenanceSchedules: 65,
          openPPM: 12,
          overduePPM: 2,
          totalCoverages: 305
        }
      ])
    };
  });

  describe('Rendering', () => {
    it('should render dashboard title', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Asset Management Dashboard')).toBeInTheDocument();
      });
    });

    it('should render KPI cards', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Assets')).toBeInTheDocument();
        expect(screen.getByText('Active Repairs')).toBeInTheDocument();
        expect(screen.getByText('PPM Compliance')).toBeInTheDocument();
        expect(screen.getByText('Critical Issues')).toBeInTheDocument();
      });
    });

    it('should render location summary table', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Total Assets')).toBeInTheDocument();
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
        expect(screen.getByText('Delhi - CP')).toBeInTheDocument();
      });
    });

    it('should render search and filter controls', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search locations...')).toBeInTheDocument();
        expect(screen.getByText('All Locations')).toBeInTheDocument();
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should show loading state initially', () => {
      mockAPI.dashboardAPI.getKPIs.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<Dashboard />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load KPI data on mount', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(mockAPI.dashboardAPI.getKPIs).toHaveBeenCalledTimes(1);
        expect(mockAPI.dashboardAPI.getLocationSummary).toHaveBeenCalledTimes(1);
      });
    });

    it('should display KPI values correctly', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('2,847')).toBeInTheDocument(); // Total Assets
        expect(screen.getByText('23')).toBeInTheDocument(); // Active Repairs
        expect(screen.getByText('94.2%')).toBeInTheDocument(); // PPM Compliance
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAPI.dashboardAPI.getKPIs.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/error loading dashboard data/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockAPI.dashboardAPI.getKPIs.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading data when retry button is clicked', async () => {
      mockAPI.dashboardAPI.getKPIs
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockApiResponses.dashboard.success.data);
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(mockAPI.dashboardAPI.getKPIs).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter locations by search term', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
        expect(screen.getByText('Delhi - CP')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search locations...');
      fireEvent.change(searchInput, { target: { value: 'Mumbai' } });
      
      await waitFor(() => {
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
        expect(screen.queryByText('Delhi - CP')).not.toBeInTheDocument();
      });
    });

    it('should show no results message when search yields no matches', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search locations...');
      fireEvent.change(searchInput, { target: { value: 'NonExistentLocation' } });
      
      await waitFor(() => {
        expect(screen.getByText('No locations found matching your criteria')).toBeInTheDocument();
      });
    });

    it('should clear search when clear button is clicked', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search locations...');
      fireEvent.change(searchInput, { target: { value: 'Mumbai' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Delhi - CP')).not.toBeInTheDocument();
      });
      
      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
        expect(screen.getByText('Delhi - CP')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation and Drill-down', () => {
    it('should navigate to assets page when total assets is clicked', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('450')).toBeInTheDocument(); // Mumbai assets count
      });
      
      const assetsCell = screen.getByText('450');
      fireEvent.click(assetsCell);
      
      expect(mockNavigate).toHaveBeenCalledWith('/assets', {
        state: { 
          filters: { 
            location: 'Mumbai - Andheri',
            metric: 'assets'
          }
        }
      });
    });

    it('should navigate to repairs page when repairs count is clicked', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('12')).toBeInTheDocument(); // Mumbai repairs count
      });
      
      const repairsCell = screen.getAllByText('12')[0]; // First occurrence (repairs)
      fireEvent.click(repairsCell);
      
      expect(mockNavigate).toHaveBeenCalledWith('/repairs', {
        state: { 
          filters: { 
            location: 'Mumbai - Andheri',
            metric: 'repairs'
          }
        }
      });
    });

    it('should expand location row when dropdown is clicked', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
      });
      
      const dropdownButton = screen.getAllByLabelText('Expand location details')[0];
      fireEvent.click(dropdownButton);
      
      await waitFor(() => {
        expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
      });
    });

    it('should collapse location row when dropdown is clicked again', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
      });
      
      const dropdownButton = screen.getAllByLabelText('Expand location details')[0];
      
      // Expand
      fireEvent.click(dropdownButton);
      await waitFor(() => {
        expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
      });
      
      // Collapse
      fireEvent.click(dropdownButton);
      await waitFor(() => {
        expect(screen.queryByText('Category Breakdown')).not.toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should trigger CSV export when export button is clicked', async () => {
      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn(() => 'mock-url');
      global.URL.revokeObjectURL = jest.fn();
      
      // Mock document.createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockLink);
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
      
      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle mobile viewport', async () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Asset Management Dashboard')).toBeInTheDocument();
      });
      
      // Check that mobile-specific classes are applied
      const container = screen.getByTestId('dashboard-container');
      expect(container).toHaveClass('px-4'); // Mobile padding
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Search locations')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by location')).toBeInTheDocument();
        expect(screen.getByLabelText('Export dashboard data')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<Dashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
      });
      
      const dropdownButton = screen.getAllByLabelText('Expand location details')[0];
      
      // Test Enter key
      fireEvent.keyDown(dropdownButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Category Breakdown')).toBeInTheDocument();
      });
    });
  });
});
