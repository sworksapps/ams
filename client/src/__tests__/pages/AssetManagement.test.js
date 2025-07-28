import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockApiResponses } from '../utils/testUtils';
import AssetManagement from '../../pages/AssetManagement';
import * as api from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api');
const mockAPI = api;

// Mock file upload
global.FormData = jest.fn(() => ({
  append: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  has: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
  values: jest.fn(),
  entries: jest.fn(),
  forEach: jest.fn()
}));

describe('AssetManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    mockAPI.assetsAPI = {
      getAssets: jest.fn().mockResolvedValue(mockApiResponses.assets.success.data),
      createAsset: jest.fn().mockResolvedValue({ id: 1, name: 'Test Asset' }),
      updateAsset: jest.fn().mockResolvedValue({ id: 1, name: 'Updated Asset' }),
      deleteAsset: jest.fn().mockResolvedValue({ success: true }),
      uploadDocument: jest.fn().mockResolvedValue({ url: 'https://example.com/doc.pdf' })
    };
    
    mockAPI.locationsAPI = {
      getLocations: jest.fn().mockResolvedValue(mockApiResponses.locations.success.data)
    };
    
    mockAPI.categoriesAPI = {
      getCategories: jest.fn().mockResolvedValue(mockApiResponses.categories.success.data),
      getSubcategories: jest.fn().mockResolvedValue(mockApiResponses.subcategories.success.data)
    };
  });

  describe('Rendering', () => {
    it('should render asset management title', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Asset Management')).toBeInTheDocument();
      });
    });

    it('should render create asset button', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Asset')).toBeInTheDocument();
      });
    });

    it('should render assets table', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Asset Name')).toBeInTheDocument();
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });

    it('should render search and filter controls', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
        expect(screen.getByText('All Categories')).toBeInTheDocument();
        expect(screen.getByText('All Locations')).toBeInTheDocument();
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should show loading state initially', () => {
      mockAPI.assetsAPI.getAssets.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<AssetManagement />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load assets data on mount', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(mockAPI.assetsAPI.getAssets).toHaveBeenCalledTimes(1);
        expect(mockAPI.locationsAPI.getLocations).toHaveBeenCalledTimes(1);
        expect(mockAPI.categoriesAPI.getCategories).toHaveBeenCalledTimes(1);
      });
    });

    it('should display asset data correctly', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
        expect(screen.getByText('HVAC')).toBeInTheDocument();
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAPI.assetsAPI.getAssets.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText(/error loading assets/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockAPI.assetsAPI.getAssets.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading data when retry button is clicked', async () => {
      mockAPI.assetsAPI.getAssets
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockApiResponses.assets.success.data);
      
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(mockAPI.assetsAPI.getAssets).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Asset Creation', () => {
    it('should open create asset modal when create button is clicked', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Asset')).toBeInTheDocument();
      });
      
      const createButton = screen.getByText('Create Asset');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create New Asset')).toBeInTheDocument();
      });
    });

    it('should render asset creation form fields', async () => {
      renderWithProviders(<AssetManagement />);
      
      const createButton = screen.getByText('Create Asset');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Asset Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Category')).toBeInTheDocument();
        expect(screen.getByLabelText('Subcategory')).toBeInTheDocument();
        expect(screen.getByLabelText('Location')).toBeInTheDocument();
        expect(screen.getByLabelText('Serial Number')).toBeInTheDocument();
        expect(screen.getByLabelText('Model')).toBeInTheDocument();
        expect(screen.getByLabelText('Manufacturer')).toBeInTheDocument();
        expect(screen.getByLabelText('Purchase Date')).toBeInTheDocument();
        expect(screen.getByLabelText('Warranty Expiry')).toBeInTheDocument();
        expect(screen.getByLabelText('Status')).toBeInTheDocument();
      });
    });

    it('should load subcategories when category is selected', async () => {
      renderWithProviders(<AssetManagement />);
      
      const createButton = screen.getByText('Create Asset');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Category')).toBeInTheDocument();
      });
      
      const categorySelect = screen.getByLabelText('Category');
      fireEvent.change(categorySelect, { target: { value: '1' } });
      
      await waitFor(() => {
        expect(mockAPI.categoriesAPI.getSubcategories).toHaveBeenCalledWith('1');
      });
    });

    it('should create asset when form is submitted', async () => {
      renderWithProviders(<AssetManagement />);
      
      const createButton = screen.getByText('Create Asset');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create New Asset')).toBeInTheDocument();
      });
      
      // Fill form
      const nameInput = screen.getByLabelText('Asset Name');
      fireEvent.change(nameInput, { target: { value: 'Test Asset' } });
      
      const categorySelect = screen.getByLabelText('Category');
      fireEvent.change(categorySelect, { target: { value: '1' } });
      
      const locationSelect = screen.getByLabelText('Location');
      fireEvent.change(locationSelect, { target: { value: '1' } });
      
      const serialInput = screen.getByLabelText('Serial Number');
      fireEvent.change(serialInput, { target: { value: 'SN123456' } });
      
      // Submit form
      const submitButton = screen.getByText('Create Asset');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAPI.assetsAPI.createAsset).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Asset',
            category_id: '1',
            location_id: '1',
            serial_number: 'SN123456'
          })
        );
      });
    });

    it('should close modal after successful asset creation', async () => {
      renderWithProviders(<AssetManagement />);
      
      const createButton = screen.getByText('Create Asset');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create New Asset')).toBeInTheDocument();
      });
      
      // Fill and submit form
      const nameInput = screen.getByLabelText('Asset Name');
      fireEvent.change(nameInput, { target: { value: 'Test Asset' } });
      
      const submitButton = screen.getByText('Create Asset');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Create New Asset')).not.toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      renderWithProviders(<AssetManagement />);
      
      const createButton = screen.getByText('Create Asset');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create New Asset')).toBeInTheDocument();
      });
      
      // Try to submit without filling required fields
      const submitButton = screen.getByText('Create Asset');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Asset name is required')).toBeInTheDocument();
        expect(screen.getByText('Category is required')).toBeInTheDocument();
        expect(screen.getByText('Location is required')).toBeInTheDocument();
      });
    });
  });

  describe('Asset Editing', () => {
    it('should open edit modal when edit button is clicked', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Asset')).toBeInTheDocument();
      });
    });

    it('should populate form with existing asset data', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Asset Name');
        expect(nameInput.value).toBe('AC Unit 1');
      });
    });

    it('should update asset when form is submitted', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const editButton = screen.getAllByText('Edit')[0];
      fireEvent.click(editButton);
      
      await waitFor(() => {
        expect(screen.getByText('Edit Asset')).toBeInTheDocument();
      });
      
      // Update asset name
      const nameInput = screen.getByLabelText('Asset Name');
      fireEvent.change(nameInput, { target: { value: 'Updated AC Unit' } });
      
      // Submit form
      const submitButton = screen.getByText('Update Asset');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAPI.assetsAPI.updateAsset).toHaveBeenCalledWith(
          expect.any(Number),
          expect.objectContaining({
            name: 'Updated AC Unit'
          })
        );
      });
    });
  });

  describe('Asset Deletion', () => {
    it('should delete asset when delete button is clicked', async () => {
      // Mock window.confirm
      global.confirm = jest.fn(() => true);
      
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this asset?');
        expect(mockAPI.assetsAPI.deleteAsset).toHaveBeenCalledWith(expect.any(Number));
      });
    });

    it('should not delete asset when confirmation is cancelled', async () => {
      // Mock window.confirm to return false
      global.confirm = jest.fn(() => false);
      
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const deleteButton = screen.getAllByText('Delete')[0];
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalled();
        expect(mockAPI.assetsAPI.deleteAsset).not.toHaveBeenCalled();
      });
    });
  });

  describe('Document Upload', () => {
    it('should handle file upload', async () => {
      renderWithProviders(<AssetManagement />);
      
      const createButton = screen.getByText('Create Asset');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Upload Documents')).toBeInTheDocument();
      });
      
      const fileInput = screen.getByLabelText('Upload Documents');
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('should validate file types', async () => {
      renderWithProviders(<AssetManagement />);
      
      const createButton = screen.getByText('Create Asset');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Upload Documents')).toBeInTheDocument();
      });
      
      const fileInput = screen.getByLabelText('Upload Documents');
      const file = new File(['test content'], 'test.exe', { type: 'application/exe' });
      
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText('Invalid file type. Please upload PDF, DOC, DOCX, or image files.')).toBeInTheDocument();
      });
    });

    it('should validate file size', async () => {
      renderWithProviders(<AssetManagement />);
      
      const createButton = screen.getByText('Create Asset');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Upload Documents')).toBeInTheDocument();
      });
      
      const fileInput = screen.getByLabelText('Upload Documents');
      // Create a large file (>10MB)
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      await waitFor(() => {
        expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter assets by search term', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search assets...');
      fireEvent.change(searchInput, { target: { value: 'AC' } });
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
        // Assuming there's another asset that doesn't match
        expect(screen.queryByText('Generator 1')).not.toBeInTheDocument();
      });
    });

    it('should filter assets by category', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('All Categories')).toBeInTheDocument();
      });
      
      const categoryFilter = screen.getByDisplayValue('All Categories');
      fireEvent.change(categoryFilter, { target: { value: 'HVAC' } });
      
      await waitFor(() => {
        expect(mockAPI.assetsAPI.getAssets).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'HVAC' })
        );
      });
    });

    it('should filter assets by location', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('All Locations')).toBeInTheDocument();
      });
      
      const locationFilter = screen.getByDisplayValue('All Locations');
      fireEvent.change(locationFilter, { target: { value: 'Mumbai - Andheri' } });
      
      await waitFor(() => {
        expect(mockAPI.assetsAPI.getAssets).toHaveBeenCalledWith(
          expect.objectContaining({ location: 'Mumbai - Andheri' })
        );
      });
    });

    it('should filter assets by status', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
      
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusFilter, { target: { value: 'Active' } });
      
      await waitFor(() => {
        expect(mockAPI.assetsAPI.getAssets).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Active' })
        );
      });
    });

    it('should clear all filters when clear button is clicked', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('All Categories')).toBeInTheDocument();
      });
      
      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search assets...');
      fireEvent.change(searchInput, { target: { value: 'AC' } });
      
      const categoryFilter = screen.getByDisplayValue('All Categories');
      fireEvent.change(categoryFilter, { target: { value: 'HVAC' } });
      
      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(searchInput.value).toBe('');
        expect(categoryFilter.value).toBe('');
      });
    });
  });

  describe('Table Interactions', () => {
    it('should sort table by column when header is clicked', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Asset Name')).toBeInTheDocument();
      });
      
      const assetNameHeader = screen.getByText('Asset Name');
      fireEvent.click(assetNameHeader);
      
      // Check that sorting indicator is present
      expect(assetNameHeader.closest('th')).toHaveAttribute('aria-sort');
    });

    it('should show asset details when row is clicked', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const assetRow = screen.getByText('AC Unit 1').closest('tr');
      fireEvent.click(assetRow);
      
      await waitFor(() => {
        expect(screen.getByText('Asset Details')).toBeInTheDocument();
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
      
      renderWithProviders(<AssetManagement />);
      
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

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Search assets')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by location')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Asset')).toBeInTheDocument();
      });
      
      const createButton = screen.getByText('Create Asset');
      
      // Test Enter key
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Create New Asset')).toBeInTheDocument();
      });
    });

    it('should have proper form labels and validation', async () => {
      renderWithProviders(<AssetManagement />);
      
      const createButton = screen.getByText('Create Asset');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        const nameInput = screen.getByLabelText('Asset Name');
        expect(nameInput).toHaveAttribute('required');
        expect(nameInput).toHaveAttribute('aria-describedby');
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no assets are available', async () => {
      mockAPI.assetsAPI.getAssets.mockResolvedValue({
        assets: [],
        total: 0
      });
      
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('No assets found')).toBeInTheDocument();
        expect(screen.getByText('There are currently no assets matching your criteria.')).toBeInTheDocument();
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should select multiple assets', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // First asset checkbox
      fireEvent.click(checkboxes[2]); // Second asset checkbox
      
      await waitFor(() => {
        expect(screen.getByText('2 selected')).toBeInTheDocument();
      });
    });

    it('should show bulk actions when assets are selected', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);
      
      await waitFor(() => {
        expect(screen.getByText('Bulk Delete')).toBeInTheDocument();
        expect(screen.getByText('Bulk Export')).toBeInTheDocument();
      });
    });

    it('should perform bulk delete operation', async () => {
      global.confirm = jest.fn(() => true);
      
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const checkbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(checkbox);
      
      await waitFor(() => {
        expect(screen.getByText('Bulk Delete')).toBeInTheDocument();
      });
      
      const bulkDeleteButton = screen.getByText('Bulk Delete');
      fireEvent.click(bulkDeleteButton);
      
      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete 1 selected asset(s)?');
        expect(mockAPI.assetsAPI.deleteAsset).toHaveBeenCalled();
      });
    });
  });

  describe('Asset Status Management', () => {
    it('should display status badges with correct colors', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        const activeBadge = screen.getByText('Active');
        expect(activeBadge).toHaveClass('bg-green-100', 'text-green-800');
      });
    });

    it('should allow status change from dropdown', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const statusDropdown = screen.getAllByRole('combobox').find(select => 
        select.getAttribute('aria-label') === 'Change status'
      );
      
      if (statusDropdown) {
        fireEvent.change(statusDropdown, { target: { value: 'Inactive' } });
        
        await waitFor(() => {
          expect(mockAPI.assetsAPI.updateAsset).toHaveBeenCalledWith(
            expect.any(Number),
            expect.objectContaining({ status: 'Inactive' })
          );
        });
      }
    });
  });

  describe('Asset History', () => {
    it('should show asset history when history button is clicked', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const historyButton = screen.getAllByText('History')[0];
      fireEvent.click(historyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Asset History')).toBeInTheDocument();
      });
    });

    it('should display maintenance history', async () => {
      renderWithProviders(<AssetManagement />);
      
      await waitFor(() => {
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
      });
      
      const historyButton = screen.getAllByText('History')[0];
      fireEvent.click(historyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Maintenance Records')).toBeInTheDocument();
        expect(screen.getByText('Repair History')).toBeInTheDocument();
        expect(screen.getByText('AMC Records')).toBeInTheDocument();
      });
    });
  });
});
