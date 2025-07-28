import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockApiResponses } from '../utils/testUtils';
import AssetDashboard from '../../pages/AssetDashboard';
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

describe('AssetDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    mockAPI.assetsAPI = {
      getAssets: jest.fn().mockResolvedValue(mockApiResponses.assets.success),
      getLocations: jest.fn().mockResolvedValue(mockApiResponses.locations.success.data),
      getCategories: jest.fn().mockResolvedValue(mockApiResponses.categories.success.data),
      deleteAsset: jest.fn().mockResolvedValue({ success: true })
    };
  });

  describe('Rendering', () => {
    it('should render asset dashboard title', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Asset Management')).toBeInTheDocument();
      });
    });

    it('should render KPI cards', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Assets')).toBeInTheDocument();
        expect(screen.getByText('Active Repairs')).toBeInTheDocument();
        expect(screen.getByText('PPM Compliance')).toBeInTheDocument();
        expect(screen.getByText('Critical Issues')).toBeInTheDocument();
      });
    });

    it('should render assets table', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Equipment Name')).toBeInTheDocument();
        expect(screen.getByText('Serial Number')).toBeInTheDocument();
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Coverage Status')).toBeInTheDocument();
      });
    });

    it('should render filter controls', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
        expect(screen.getByText('All Locations')).toBeInTheDocument();
        expect(screen.getByText('All Categories')).toBeInTheDocument();
      });
    });

    it('should render action buttons', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Asset')).toBeInTheDocument();
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should show loading state initially', () => {
      mockAPI.assetsAPI.getAssets.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<AssetDashboard />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load assets data on mount', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(mockAPI.assetsAPI.getAssets).toHaveBeenCalledTimes(1);
        expect(mockAPI.assetsAPI.getLocations).toHaveBeenCalledTimes(1);
        expect(mockAPI.assetsAPI.getCategories).toHaveBeenCalledTimes(1);
      });
    });

    it('should display asset data correctly', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
        expect(screen.getByText('SN001')).toBeInTheDocument();
        expect(screen.getByText('HVAC')).toBeInTheDocument();
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
      });
    });

    it('should calculate and display KPIs correctly', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Total assets
        expect(screen.getByText('1')).toBeInTheDocument(); // Active coverage
        expect(screen.getByText('1')).toBeInTheDocument(); // Expired coverage
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAPI.assetsAPI.getAssets.mockRejectedValue(mockApiResponses.assets.error);
      
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/error loading assets/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockAPI.assetsAPI.getAssets.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading data when retry button is clicked', async () => {
      mockAPI.assetsAPI.getAssets
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockApiResponses.assets.success);
      
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(mockAPI.assetsAPI.getAssets).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter assets by search term', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
        expect(screen.getByText('Test Equipment 2')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search assets...');
      fireEvent.change(searchInput, { target: { value: 'Equipment 1' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Equipment 2')).not.toBeInTheDocument();
      });
    });

    it('should filter assets by location', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
        expect(screen.getByText('Test Equipment 2')).toBeInTheDocument();
      });
      
      const locationFilter = screen.getByDisplayValue('All Locations');
      fireEvent.change(locationFilter, { target: { value: 'Mumbai - Andheri' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Equipment 2')).not.toBeInTheDocument();
      });
    });

    it('should filter assets by category', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
        expect(screen.getByText('Test Equipment 2')).toBeInTheDocument();
      });
      
      const categoryFilter = screen.getByDisplayValue('All Categories');
      fireEvent.change(categoryFilter, { target: { value: 'HVAC' } });
      
      await waitFor(() => {
        expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Equipment 2')).not.toBeInTheDocument();
      });
    });

    it('should show no results message when filters yield no matches', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search assets...');
      fireEvent.change(searchInput, { target: { value: 'NonExistentAsset' } });
      
      await waitFor(() => {
        expect(screen.getByText('No assets found matching your criteria')).toBeInTheDocument();
      });
    });

    it('should clear all filters when clear button is clicked', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
      });
      
      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search assets...');
      fireEvent.change(searchInput, { target: { value: 'Equipment 1' } });
      
      const locationFilter = screen.getByDisplayValue('All Locations');
      fireEvent.change(locationFilter, { target: { value: 'Mumbai - Andheri' } });
      
      await waitFor(() => {
        expect(screen.queryByText('Test Equipment 2')).not.toBeInTheDocument();
      });
      
      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test Equipment 1')).toBeInTheDocument();
        expect(screen.getByText('Test Equipment 2')).toBeInTheDocument();
        expect(searchInput.value).toBe('');
        expect(locationFilter.value).toBe('');
      });
    });
  });

  describe('Table Interactions', () => {
    it('should sort table by column when header is clicked', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Equipment Name')).toBeInTheDocument();
      });
      
      const nameHeader = screen.getByText('Equipment Name');
      fireEvent.click(nameHeader);
      
      // Check that sorting indicator is present
      expect(nameHeader.closest('th')).toHaveAttribute('aria-sort');
    });

    it('should navigate to asset details when view button is clicked', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getAllByText('View')[0]).toBeInTheDocument();
      });
      
      const viewButton = screen.getAllByText('View')[0];
      fireEvent.click(viewButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/assets/1');
    });

    it('should navigate to edit asset when edit button is clicked', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Edit')[0]).toBeInTheDocument();
      });
      
      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/assets/1/edit');
    });

    it('should show delete confirmation when delete button is clicked', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Delete')[0]).toBeInTheDocument();
      });
      
      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to delete this asset?')).toBeInTheDocument();
      });
    });

    it('should delete asset when confirmed', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Delete')[0]).toBeInTheDocument();
      });
      
      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      });
      
      const confirmButton = screen.getByText('Delete Asset');
      fireEvent.click(confirmButton);
      
      await waitFor(() => {
        expect(mockAPI.assetsAPI.deleteAsset).toHaveBeenCalledWith(1);
      });
    });

    it('should cancel delete when cancel button is clicked', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getAllByText('Delete')[0]).toBeInTheDocument();
      });
      
      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
      });
      
      expect(mockAPI.assetsAPI.deleteAsset).not.toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Mock large dataset for pagination testing
      const largeDataset = {
        data: Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          equipment_name: `Equipment ${i + 1}`,
          serial_number: `SN${String(i + 1).padStart(3, '0')}`,
          category: i % 2 === 0 ? 'HVAC' : 'Electrical',
          location: i % 2 === 0 ? 'Mumbai - Andheri' : 'Delhi - CP',
          manufacturer: 'Test Manufacturer',
          model: `Model ${i + 1}`,
          coverage_status: i % 3 === 0 ? 'Active' : 'Expired'
        })),
        total: 25
      };
      mockAPI.assetsAPI.getAssets.mockResolvedValue(largeDataset);
    });

    it('should show pagination controls when there are multiple pages', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should navigate to next page when next button is clicked', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText('Equipment 21')).toBeInTheDocument();
      });
    });

    it('should show correct page size options', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Show 20')).toBeInTheDocument();
      });
      
      const pageSizeSelect = screen.getByDisplayValue('20');
      fireEvent.change(pageSizeSelect, { target: { value: '10' } });
      
      await waitFor(() => {
        expect(screen.getByText('Show 10')).toBeInTheDocument();
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
      
      renderWithProviders(<AssetDashboard />);
      
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

  describe('Navigation', () => {
    it('should navigate to add asset page when add button is clicked', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Asset')).toBeInTheDocument();
      });
      
      const addButton = screen.getByText('Add Asset');
      fireEvent.click(addButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/assets/new');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Search assets')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by location')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Asset')).toBeInTheDocument();
      });
      
      const addButton = screen.getByText('Add Asset');
      
      // Test Enter key
      fireEvent.keyDown(addButton, { key: 'Enter', code: 'Enter' });
      
      expect(mockNavigate).toHaveBeenCalledWith('/assets/new');
    });

    it('should have proper table headers with sorting capabilities', async () => {
      renderWithProviders(<AssetDashboard />);
      
      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader');
        expect(headers.length).toBeGreaterThan(0);
        
        headers.forEach(header => {
          expect(header).toHaveAttribute('tabindex', '0');
        });
      });
    });
  });
});
