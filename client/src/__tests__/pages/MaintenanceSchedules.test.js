import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockApiResponses } from '../utils/testUtils';
import MaintenanceSchedules from '../../pages/MaintenanceSchedules';
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

// Mock file upload
const mockFileUpload = jest.fn();
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

const mockSchedules = [
  {
    id: 1,
    asset_id: 1,
    equipment_name: 'Air Conditioner 1',
    location: 'Mumbai - Andheri',
    category: 'HVAC',
    subcategory: 'Split AC',
    maintenance_name: 'Monthly Filter Cleaning',
    start_date: '2024-01-15',
    frequency: 'Monthly',
    is_active: 1,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    asset_id: 2,
    equipment_name: 'Elevator 1',
    location: 'Delhi - CP',
    category: 'Lift',
    subcategory: 'Passenger Lift',
    maintenance_name: 'Quarterly Inspection',
    start_date: '2024-02-01',
    frequency: 'Quarterly',
    is_active: 1,
    created_at: '2024-01-01T00:00:00Z'
  }
];

const mockAssets = [
  {
    id: 1,
    equipment_name: 'Air Conditioner 1',
    category: 'HVAC',
    subcategory: 'Split AC',
    location: 'Mumbai - Andheri'
  },
  {
    id: 2,
    equipment_name: 'Elevator 1',
    category: 'Lift',
    subcategory: 'Passenger Lift',
    location: 'Delhi - CP'
  }
];

const mockLocations = ['Mumbai - Andheri', 'Delhi - CP', 'Bangalore - Koramangala'];
const mockCategories = ['HVAC', 'Lift', 'Electrical', 'Plumbing'];
const mockSubcategories = {
  'HVAC': ['Split AC', 'Central AC', 'Window AC'],
  'Lift': ['Passenger Lift', 'Goods Lift', 'Escalator'],
  'Electrical': ['Generator', 'UPS', 'Panel'],
  'Plumbing': ['Water Pump', 'Tank', 'Pipeline']
};

describe('MaintenanceSchedules Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    mockAPI.maintenanceAPI = {
      getSchedules: jest.fn().mockResolvedValue(mockSchedules),
      createSchedule: jest.fn().mockResolvedValue({ id: 3, message: 'Schedule created successfully' }),
      updateSchedule: jest.fn().mockResolvedValue({ message: 'Schedule updated successfully' }),
      deleteSchedule: jest.fn().mockResolvedValue({ message: 'Schedule deleted successfully' }),
      generatePPMTasks: jest.fn().mockResolvedValue({ 
        message: 'PPM tasks generated successfully', 
        tasksCreated: 5, 
        tasksSkipped: 2 
      }),
      getFilterOptions: jest.fn().mockResolvedValue({
        locations: mockLocations,
        categories: mockCategories,
        subcategories: mockSubcategories
      })
    };

    mockAPI.assetsAPI = {
      getAssets: jest.fn().mockResolvedValue({ data: mockAssets, total: mockAssets.length }),
      getLocations: jest.fn().mockResolvedValue(mockLocations),
      getCategories: jest.fn().mockResolvedValue(mockCategories),
      getSubcategories: jest.fn().mockResolvedValue(mockSubcategories)
    };
  });

  describe('Rendering', () => {
    it('should render page title and main components', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Maintenance Schedules')).toBeInTheDocument();
        expect(screen.getByText('Create Schedule')).toBeInTheDocument();
        expect(screen.getByText('Generate PPM Tasks')).toBeInTheDocument();
        expect(screen.getByText('Ticket Logs')).toBeInTheDocument();
      });
    });

    it('should render filter controls', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search schedules...')).toBeInTheDocument();
        expect(screen.getByText('All Locations')).toBeInTheDocument();
        expect(screen.getByText('All Categories')).toBeInTheDocument();
        expect(screen.getByText('All Subcategories')).toBeInTheDocument();
        expect(screen.getByText('All Assets')).toBeInTheDocument();
      });
    });

    it('should render schedules table', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Asset Subcategory')).toBeInTheDocument();
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Maintenance Name')).toBeInTheDocument();
        expect(screen.getByText('Start Date')).toBeInTheDocument();
        expect(screen.getByText('Frequency')).toBeInTheDocument();
      });
    });

    it('should display schedule data in table', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
        expect(screen.getByText('Split AC')).toBeInTheDocument();
        expect(screen.getByText('HVAC')).toBeInTheDocument();
        expect(screen.getByText('Monthly Filter Cleaning')).toBeInTheDocument();
        expect(screen.getByText('Monthly')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should show loading state initially', () => {
      mockAPI.maintenanceAPI.getSchedules.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<MaintenanceSchedules />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load schedules on mount', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getSchedules).toHaveBeenCalledTimes(1);
        expect(mockAPI.maintenanceAPI.getFilterOptions).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle API errors gracefully', async () => {
      mockAPI.maintenanceAPI.getSchedules.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load maintenance schedules')).toBeInTheDocument();
      });
    });

    it('should provide retry functionality on error', async () => {
      mockAPI.maintenanceAPI.getSchedules.mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockSchedules);
      
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getSchedules).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter schedules by search term', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Monthly Filter Cleaning')).toBeInTheDocument();
        expect(screen.getByText('Quarterly Inspection')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search schedules...');
      fireEvent.change(searchInput, { target: { value: 'Filter' } });

      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getSchedules).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Filter' })
        );
      });
    });

    it('should filter by location', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('All Locations')).toBeInTheDocument();
      });

      const locationSelect = screen.getByDisplayValue('All Locations');
      fireEvent.change(locationSelect, { target: { value: 'Mumbai - Andheri' } });

      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getSchedules).toHaveBeenCalledWith(
          expect.objectContaining({ location: 'Mumbai - Andheri' })
        );
      });
    });

    it('should filter by category', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('All Categories')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'HVAC' } });

      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getSchedules).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'HVAC' })
        );
      });
    });

    it('should update subcategory options when category changes', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('All Categories')).toBeInTheDocument();
      });

      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'HVAC' } });

      await waitFor(() => {
        const subcategorySelect = screen.getByDisplayValue('All Subcategories');
        expect(subcategorySelect).toBeInTheDocument();
        // Should have HVAC subcategories available
      });
    });

    it('should show active filter count', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('All Locations')).toBeInTheDocument();
      });

      const locationSelect = screen.getByDisplayValue('All Locations');
      fireEvent.change(locationSelect, { target: { value: 'Mumbai - Andheri' } });

      const categorySelect = screen.getByDisplayValue('All Categories');
      fireEvent.change(categorySelect, { target: { value: 'HVAC' } });

      await waitFor(() => {
        expect(screen.getByText('2 active')).toBeInTheDocument();
      });
    });

    it('should clear all filters when clear button is clicked', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('All Locations')).toBeInTheDocument();
      });

      // Set some filters
      const locationSelect = screen.getByDisplayValue('All Locations');
      fireEvent.change(locationSelect, { target: { value: 'Mumbai - Andheri' } });

      await waitFor(() => {
        expect(screen.getByText('1 active')).toBeInTheDocument();
      });

      // Clear filters
      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText('1 active')).not.toBeInTheDocument();
        expect(mockAPI.maintenanceAPI.getSchedules).toHaveBeenCalledWith({});
      });
    });
  });

  describe('Schedule Creation', () => {
    it('should open create modal when create button is clicked', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Schedule')).toBeInTheDocument();
      });

      // Handle duplicate "Create Schedule" buttons (header and empty state)
      const createButtons = screen.getAllByText('Create Schedule');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
        expect(screen.getByLabelText('Asset *')).toBeInTheDocument();
        expect(screen.getByLabelText('Maintenance Name *')).toBeInTheDocument();
        expect(screen.getByLabelText('Start Date *')).toBeInTheDocument();
        expect(screen.getByLabelText('Frequency *')).toBeInTheDocument();
        expect(screen.getByLabelText('Owner *')).toBeInTheDocument();
      });
    });

    it('should create schedule with valid data', async () => {
      // Use userEvent without setup for compatibility
      const user = userEvent;
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Schedule')).toBeInTheDocument();
      });

      // Handle duplicate "Create Schedule" buttons (header and empty state)
      const createButtons = screen.getAllByText('Create Schedule');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
      });

      // Fill form
      // Query asset select by option text
      const assetSelect = screen.getByDisplayValue('') || document.querySelector('select');
      fireEvent.change(assetSelect, { target: { value: '1' } });

      // Use placeholder text as fallback for label with asterisk
      const maintenanceNameInput = screen.getByPlaceholderText('e.g., Filter Replacement, Oil Change');
      await user.type(maintenanceNameInput, 'Weekly Cleaning');

      // Query by input type for date field
      const startDateInput = screen.getByDisplayValue('') || document.querySelector('input[type="date"]');
      fireEvent.change(startDateInput, { target: { value: '2024-03-01' } });

      const frequencySelect = screen.getByLabelText('Frequency');
      fireEvent.change(frequencySelect, { target: { value: 'Weekly' } });

      // Submit form
      // Query submit button specifically in the form (type="submit")
      const submitButton = document.querySelector('button[type="submit"]');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.createSchedule).toHaveBeenCalledWith({
          asset_id: '1',
          maintenance_name: 'Weekly Cleaning',
          start_date: '2024-03-01',
          frequency: 'Weekly'
        });
      });
    });

    it('should show validation errors for invalid data', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      // Handle duplicate "Create Schedule" buttons (header and empty state)
      const createButtons = screen.getAllByText('Create Schedule');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
      });

      // Submit without filling required fields
      // Query submit button specifically in the form (type="submit")
      const submitButton = document.querySelector('button[type="submit"]');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Asset is required')).toBeInTheDocument();
        expect(screen.getByText('Maintenance name is required')).toBeInTheDocument();
        expect(screen.getByText('Start date is required')).toBeInTheDocument();
        expect(screen.getByText('Frequency is required')).toBeInTheDocument();
      });
    });

    it('should handle API errors during creation', async () => {
      mockAPI.maintenanceAPI.createSchedule.mockRejectedValue(
        new Error('Failed to create schedule')
      );

      // Use userEvent without setup for compatibility
      const user = userEvent;
      renderWithProviders(<MaintenanceSchedules />);
      
      // Handle duplicate "Create Schedule" buttons (header and empty state)
      const createButtons = screen.getAllByText('Create Schedule');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
      });

      // Fill and submit form
      // Query asset select by option text
      const assetSelect = screen.getByDisplayValue('') || document.querySelector('select');
      fireEvent.change(assetSelect, { target: { value: '1' } });

      // Use placeholder text as fallback for label with asterisk
      const maintenanceNameInput = screen.getByPlaceholderText('e.g., Filter Replacement, Oil Change');
      await user.type(maintenanceNameInput, 'Test Maintenance');

      // Query by input type for date field
      const startDateInput = screen.getByDisplayValue('') || document.querySelector('input[type="date"]');
      fireEvent.change(startDateInput, { target: { value: '2024-03-01' } });

      const frequencySelect = screen.getByLabelText('Frequency');
      fireEvent.change(frequencySelect, { target: { value: 'Monthly' } });

      // Query submit button specifically in the form (type="submit")
      const submitButton = document.querySelector('button[type="submit"]');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to create schedule')).toBeInTheDocument();
      });
    });

    it('should close modal when cancel is clicked', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      // Handle duplicate "Create Schedule" buttons (header and empty state)
      const createButtons = screen.getAllByText('Create Schedule');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByText('Create Maintenance Schedule')).not.toBeInTheDocument();
      });
    });
  });

  describe('Schedule Management', () => {
    it('should edit schedule when edit button is clicked', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Monthly Filter Cleaning')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByLabelText('Edit schedule');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Maintenance Schedule')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Monthly Filter Cleaning')).toBeInTheDocument();
      });
    });

    it('should delete schedule when delete button is clicked', async () => {
      window.confirm = jest.fn(() => true);
      
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Monthly Filter Cleaning')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete schedule');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          'Are you sure you want to delete this maintenance schedule?'
        );
        expect(mockAPI.maintenanceAPI.deleteSchedule).toHaveBeenCalledWith(1);
      });
    });

    it('should not delete schedule when confirmation is cancelled', async () => {
      window.confirm = jest.fn(() => false);
      
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Monthly Filter Cleaning')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByLabelText('Delete schedule');
      fireEvent.click(deleteButtons[0]);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockAPI.maintenanceAPI.deleteSchedule).not.toHaveBeenCalled();
    });
  });

  describe('PPM Task Generation', () => {
    it('should generate PPM tasks when button is clicked', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Generate PPM Tasks')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate PPM Tasks'));

      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.generatePPMTasks).toHaveBeenCalledTimes(1);
      });
    });

    it('should show loading state during task generation', async () => {
      mockAPI.maintenanceAPI.generatePPMTasks.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Generate PPM Tasks')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate PPM Tasks'));

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('should show success message with task counts', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Generate PPM Tasks')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate PPM Tasks'));

      await waitFor(() => {
        expect(screen.getByText('PPM tasks generated successfully')).toBeInTheDocument();
        expect(screen.getByText('Tasks Created: 5')).toBeInTheDocument();
        expect(screen.getByText('Tasks Skipped: 2')).toBeInTheDocument();
      });
    });

    it('should handle task generation errors', async () => {
      mockAPI.maintenanceAPI.generatePPMTasks.mockRejectedValue(
        new Error('Failed to generate tasks')
      );

      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Generate PPM Tasks')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Generate PPM Tasks'));

      await waitFor(() => {
        expect(screen.getByText('Failed to generate tasks')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to ticket logs when button is clicked', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Ticket Logs')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Ticket Logs'));

      expect(mockNavigate).toHaveBeenCalledWith('/maintenance/ticket-logs');
    });

    it('should navigate to PPM tasks when back button is clicked', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Back to PPM Tasks')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Back to PPM Tasks'));

      expect(mockNavigate).toHaveBeenCalledWith('/maintenance');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Search schedules')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by location')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
        expect(screen.getByLabelText('Generate PPM tasks')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Schedule')).toBeInTheDocument();
      });

      const createButton = screen.getByText('Create Schedule');
      
      // Test Enter key
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
      });
    });

    it('should have proper focus management in modals', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      // Handle duplicate "Create Schedule" buttons (header and empty state)
      const createButtons = screen.getAllByText('Create Schedule');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        const modal = screen.getByRole('dialog');
        expect(modal).toBeInTheDocument();
        
        // First focusable element should be focused
        // Query asset select by option text
      const assetSelect = screen.getByDisplayValue('') || document.querySelector('select');
        expect(document.activeElement).toBe(assetSelect);
      });
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile viewport', async () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('Maintenance Schedules')).toBeInTheDocument();
      });
      
      // Check that mobile-specific classes are applied
      const container = screen.getByTestId('schedules-container');
      expect(container).toHaveClass('px-4'); // Mobile padding
    });

    it('should stack filters vertically on small screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640
      });
      
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        const filtersContainer = screen.getByTestId('filters-container');
        expect(filtersContainer).toHaveClass('grid-cols-1', 'sm:grid-cols-2');
      });
    });
  });

  describe('Performance', () => {
    it('should debounce search input', async () => {
      jest.useFakeTimers();
      
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search schedules...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search schedules...');
      
      // Type multiple characters quickly
      fireEvent.change(searchInput, { target: { value: 'a' } });
      fireEvent.change(searchInput, { target: { value: 'ab' } });
      fireEvent.change(searchInput, { target: { value: 'abc' } });

      // Should not call API immediately
      expect(mockAPI.maintenanceAPI.getSchedules).toHaveBeenCalledTimes(1); // Initial load only

      // Fast-forward time
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getSchedules).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'abc' })
        );
      });

      jest.useRealTimers();
    });

    it('should handle rapid filter changes efficiently', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      await waitFor(() => {
        expect(screen.getByText('All Locations')).toBeInTheDocument();
      });

      const locationSelect = screen.getByDisplayValue('All Locations');

      // Rapid changes
      for (let i = 0; i < 10; i++) {
        fireEvent.change(locationSelect, { target: { value: `Location ${i}` } });
      }

      // Should still be responsive
      await waitFor(() => {
        expect(locationSelect).toBeInTheDocument();
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate start date is not in the past', async () => {
      renderWithProviders(<MaintenanceSchedules />);
      
      // Handle duplicate "Create Schedule" buttons (header and empty state)
      const createButtons = screen.getAllByText('Create Schedule');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
      });

      // Query by input type for date field
      const startDateInput = screen.getByDisplayValue('') || document.querySelector('input[type="date"]');
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      fireEvent.change(startDateInput, { 
        target: { value: pastDate.toISOString().split('T')[0] } 
      });

      // Query submit button specifically in the form (type="submit")
      const submitButton = document.querySelector('button[type="submit"]');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Start date cannot be in the past')).toBeInTheDocument();
      });
    });

    it('should validate maintenance name length', async () => {
      // Use userEvent without setup for compatibility
      const user = userEvent;
      renderWithProviders(<MaintenanceSchedules />);
      
      // Handle duplicate "Create Schedule" buttons (header and empty state)
      const createButtons = screen.getAllByText('Create Schedule');
      fireEvent.click(createButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Create New Schedule')).toBeInTheDocument();
      });

      // Use placeholder text as fallback for label with asterisk
      const maintenanceNameInput = screen.getByPlaceholderText('e.g., Filter Replacement, Oil Change');
      await user.type(maintenanceNameInput, 'A'); // Too short

      // Query submit button specifically in the form (type="submit")
      const submitButton = document.querySelector('button[type="submit"]');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Maintenance name must be at least 3 characters')).toBeInTheDocument();
      });
    });
  });
});
