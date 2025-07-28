import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockApiResponses } from '../utils/testUtils';
import Repairs from '../../pages/Repairs';
import * as api from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api');
const mockAPI = api;

describe('Repairs Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    mockAPI.repairsAPI = {
      getTickets: jest.fn().mockResolvedValue(mockApiResponses.repairs.success.data),
      getKPIs: jest.fn().mockResolvedValue(mockApiResponses.repairs.success.data.kpis),
      getFilterOptions: jest.fn().mockResolvedValue({
        statuses: ['Open', 'In Progress', 'Closed'],
        locations: ['Mumbai - Andheri', 'Delhi - CP'],
        categories: ['Electrical', 'HVAC', 'Plumbing']
      }),
      createTicket: jest.fn().mockResolvedValue({ id: 1, ticket_number: 'REP001' }),
      updateTicket: jest.fn().mockResolvedValue({ id: 1, status: 'In Progress' }),
      deleteTicket: jest.fn().mockResolvedValue({ success: true })
    };
  });

  describe('Rendering', () => {
    it('should render repairs title', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Repairs & Maintenance')).toBeInTheDocument();
      });
    });

    it('should render KPI cards', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Repairs')).toBeInTheDocument();
        expect(screen.getByText('Open Repairs')).toBeInTheDocument();
        expect(screen.getByText('Critical Repairs')).toBeInTheDocument();
        expect(screen.getByText('Past Due')).toBeInTheDocument();
        expect(screen.getByText('Closed Repairs')).toBeInTheDocument();
      });
    });

    it('should render repairs table', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Ticket Number')).toBeInTheDocument();
        expect(screen.getByText('Asset')).toBeInTheDocument();
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Category')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Priority')).toBeInTheDocument();
        expect(screen.getByText('Created Date')).toBeInTheDocument();
      });
    });

    it('should render filter controls', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search repairs...')).toBeInTheDocument();
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
        expect(screen.getByText('All Locations')).toBeInTheDocument();
        expect(screen.getByText('All Categories')).toBeInTheDocument();
      });
    });

    it('should render action buttons', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Repair')).toBeInTheDocument();
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should show loading state initially', () => {
      mockAPI.repairsAPI.getTickets.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<Repairs />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load repairs data on mount', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledTimes(1);
        expect(mockAPI.repairsAPI.getKPIs).toHaveBeenCalledTimes(1);
        expect(mockAPI.repairsAPI.getFilterOptions).toHaveBeenCalledTimes(1);
      });
    });

    it('should display repair data correctly', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('REP001')).toBeInTheDocument();
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
        expect(screen.getByText('Electrical')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
      });
    });

    it('should display KPI values correctly', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('75')).toBeInTheDocument(); // Total repairs
        expect(screen.getByText('20')).toBeInTheDocument(); // Open repairs
        expect(screen.getByText('8')).toBeInTheDocument(); // Critical repairs
        expect(screen.getByText('5')).toBeInTheDocument(); // Past due
        expect(screen.getByText('42')).toBeInTheDocument(); // Closed repairs
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAPI.repairsAPI.getTickets.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText(/error loading repairs/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockAPI.repairsAPI.getTickets.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading data when retry button is clicked', async () => {
      mockAPI.repairsAPI.getTickets
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockApiResponses.repairs.success.data);
      
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter repairs by search term', async () => {
      const mockRepairs = {
        repairs: [
          {
            id: 1,
            ticket_number: 'REP001',
            asset_name: 'HVAC Unit 1',
            location: 'Mumbai - Andheri',
            category: 'HVAC',
            status: 'Open',
            priority: 'High',
            created_date: '2024-01-15'
          },
          {
            id: 2,
            ticket_number: 'REP002',
            asset_name: 'Generator 1',
            location: 'Delhi - CP',
            category: 'Electrical',
            status: 'Open',
            priority: 'Medium',
            created_date: '2024-01-16'
          }
        ],
        total: 2,
        kpis: mockApiResponses.repairs.success.data.kpis
      };
      
      mockAPI.repairsAPI.getTickets.mockResolvedValue(mockRepairs);
      
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('HVAC Unit 1')).toBeInTheDocument();
        expect(screen.getByText('Generator 1')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search repairs...');
      fireEvent.change(searchInput, { target: { value: 'HVAC' } });
      
      await waitFor(() => {
        expect(screen.getByText('HVAC Unit 1')).toBeInTheDocument();
        expect(screen.queryByText('Generator 1')).not.toBeInTheDocument();
      });
    });

    it('should filter repairs by status', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
      
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusFilter, { target: { value: 'Open' } });
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Open' })
        );
      });
    });

    it('should filter repairs by location', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('All Locations')).toBeInTheDocument();
      });
      
      const locationFilter = screen.getByDisplayValue('All Locations');
      fireEvent.change(locationFilter, { target: { value: 'Mumbai - Andheri' } });
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledWith(
          expect.objectContaining({ location: 'Mumbai - Andheri' })
        );
      });
    });

    it('should filter repairs by category', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('All Categories')).toBeInTheDocument();
      });
      
      const categoryFilter = screen.getByDisplayValue('All Categories');
      fireEvent.change(categoryFilter, { target: { value: 'Electrical' } });
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'Electrical' })
        );
      });
    });

    it('should show active filter count', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
      
      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search repairs...');
      fireEvent.change(searchInput, { target: { value: 'REP' } });
      
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusFilter, { target: { value: 'Open' } });
      
      const categoryFilter = screen.getByDisplayValue('All Categories');
      fireEvent.change(categoryFilter, { target: { value: 'Electrical' } });
      
      await waitFor(() => {
        expect(screen.getByText('3 active')).toBeInTheDocument();
      });
    });

    it('should clear all filters when clear button is clicked', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
      
      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search repairs...');
      fireEvent.change(searchInput, { target: { value: 'REP' } });
      
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusFilter, { target: { value: 'Open' } });
      
      await waitFor(() => {
        expect(screen.getByText('2 active')).toBeInTheDocument();
      });
      
      // Clear filters
      const clearButton = screen.getByText('Clear Filters');
      fireEvent.click(clearButton);
      
      await waitFor(() => {
        expect(searchInput.value).toBe('');
        expect(statusFilter.value).toBe('');
        expect(screen.queryByText('2 active')).not.toBeInTheDocument();
      });
    });
  });

  describe('KPI Interactions', () => {
    it('should filter by status when KPI card is clicked', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Open Repairs')).toBeInTheDocument();
      });
      
      const openRepairsCard = screen.getByText('Open Repairs').closest('.kpi-card');
      fireEvent.click(openRepairsCard);
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Open' })
        );
      });
    });

    it('should show visual feedback when KPI card is active', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Open Repairs')).toBeInTheDocument();
      });
      
      const openRepairsCard = screen.getByText('Open Repairs').closest('.kpi-card');
      fireEvent.click(openRepairsCard);
      
      await waitFor(() => {
        expect(openRepairsCard).toHaveClass('ring-2', 'ring-blue-500');
      });
    });
  });

  describe('Repair Creation', () => {
    it('should open create repair modal when create button is clicked', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Repair')).toBeInTheDocument();
      });
      
      const createButton = screen.getByText('Create Repair');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create Repair Ticket')).toBeInTheDocument();
      });
    });

    it('should create repair when form is submitted', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Repair')).toBeInTheDocument();
      });
      
      const createButton = screen.getByText('Create Repair');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create Repair Ticket')).toBeInTheDocument();
      });
      
      // Fill form
      const assetSelect = screen.getByLabelText('Asset');
      fireEvent.change(assetSelect, { target: { value: '1' } });
      
      const categorySelect = screen.getByLabelText('Category');
      fireEvent.change(categorySelect, { target: { value: 'Electrical' } });
      
      const prioritySelect = screen.getByLabelText('Priority');
      fireEvent.change(prioritySelect, { target: { value: 'High' } });
      
      const descriptionInput = screen.getByLabelText('Description');
      fireEvent.change(descriptionInput, { target: { value: 'AC unit not working' } });
      
      // Submit form
      const submitButton = screen.getByText('Create Repair');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.createTicket).toHaveBeenCalledWith({
          asset_id: '1',
          category: 'Electrical',
          priority: 'High',
          description: 'AC unit not working'
        });
      });
    });

    it('should close modal after successful repair creation', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Repair')).toBeInTheDocument();
      });
      
      const createButton = screen.getByText('Create Repair');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create Repair Ticket')).toBeInTheDocument();
      });
      
      // Fill and submit form
      const assetSelect = screen.getByLabelText('Asset');
      fireEvent.change(assetSelect, { target: { value: '1' } });
      
      const submitButton = screen.getByText('Create Repair');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Create Repair Ticket')).not.toBeInTheDocument();
      });
    });
  });

  describe('Repair Management', () => {
    it('should show repair details when row is clicked', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('REP001')).toBeInTheDocument();
      });
      
      const repairRow = screen.getByText('REP001').closest('tr');
      fireEvent.click(repairRow);
      
      await waitFor(() => {
        expect(screen.getByText('Repair Details')).toBeInTheDocument();
      });
    });

    it('should update repair status', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('REP001')).toBeInTheDocument();
      });
      
      const repairRow = screen.getByText('REP001').closest('tr');
      fireEvent.click(repairRow);
      
      await waitFor(() => {
        expect(screen.getByText('Repair Details')).toBeInTheDocument();
      });
      
      const statusSelect = screen.getByLabelText('Status');
      fireEvent.change(statusSelect, { target: { value: 'In Progress' } });
      
      const updateButton = screen.getByText('Update Status');
      fireEvent.click(updateButton);
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.updateTicket).toHaveBeenCalledWith(
          expect.any(Number),
          expect.objectContaining({ status: 'In Progress' })
        );
      });
    });

    it('should delete repair when delete button is clicked', async () => {
      // Mock window.confirm
      global.confirm = jest.fn(() => true);
      
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('REP001')).toBeInTheDocument();
      });
      
      const repairRow = screen.getByText('REP001').closest('tr');
      fireEvent.click(repairRow);
      
      await waitFor(() => {
        expect(screen.getByText('Repair Details')).toBeInTheDocument();
      });
      
      const deleteButton = screen.getByText('Delete Repair');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this repair?');
        expect(mockAPI.repairsAPI.deleteTicket).toHaveBeenCalledWith(expect.any(Number));
      });
    });
  });

  describe('Table Interactions', () => {
    it('should sort table by column when header is clicked', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Ticket Number')).toBeInTheDocument();
      });
      
      const ticketNumberHeader = screen.getByText('Ticket Number');
      fireEvent.click(ticketNumberHeader);
      
      // Check that sorting indicator is present
      expect(ticketNumberHeader.closest('th')).toHaveAttribute('aria-sort');
    });

    it('should handle pagination', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('REP001')).toBeInTheDocument();
      });
      
      // Check if pagination controls are present
      const nextButton = screen.queryByText('Next');
      if (nextButton) {
        fireEvent.click(nextButton);
        
        await waitFor(() => {
          expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledWith(
            expect.objectContaining({ page: 2 })
          );
        });
      }
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
      
      renderWithProviders(<Repairs />);
      
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

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledTimes(1);
      });
      
      const refreshButton = screen.getByTitle('Refresh data');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Search repairs')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by location')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by category')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Repair')).toBeInTheDocument();
      });
      
      const createButton = screen.getByText('Create Repair');
      
      // Test Enter key
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Create Repair Ticket')).toBeInTheDocument();
      });
    });

    it('should have proper table headers with sorting capabilities', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader');
        expect(headers.length).toBeGreaterThan(0);
        
        headers.forEach(header => {
          expect(header).toHaveAttribute('tabindex', '0');
        });
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no repairs are available', async () => {
      mockAPI.repairsAPI.getTickets.mockResolvedValue({
        repairs: [],
        total: 0,
        kpis: { total: 0, open: 0, critical: 0, pastDue: 0, closed: 0 }
      });
      
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('No repairs found')).toBeInTheDocument();
        expect(screen.getByText('There are currently no repairs matching your criteria.')).toBeInTheDocument();
      });
    });

    it('should show empty state with appropriate message when filters yield no results', async () => {
      mockAPI.repairsAPI.getTickets
        .mockResolvedValueOnce(mockApiResponses.repairs.success.data)
        .mockResolvedValueOnce({
          repairs: [],
          total: 0,
          kpis: { total: 0, open: 0, critical: 0, pastDue: 0, closed: 0 }
        });
      
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('REP001')).toBeInTheDocument();
      });
      
      // Apply filter that yields no results
      const searchInput = screen.getByPlaceholderText('Search repairs...');
      fireEvent.change(searchInput, { target: { value: 'NonExistentRepair' } });
      
      await waitFor(() => {
        expect(screen.getByText('No repairs found matching your criteria')).toBeInTheDocument();
      });
    });
  });

  describe('Priority Handling', () => {
    it('should display priority badges with correct colors', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        const highPriorityBadge = screen.getByText('High');
        expect(highPriorityBadge).toHaveClass('bg-red-100', 'text-red-800');
      });
    });

    it('should filter by priority correctly', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('All Priorities')).toBeInTheDocument();
      });
      
      const priorityFilter = screen.getByDisplayValue('All Priorities');
      fireEvent.change(priorityFilter, { target: { value: 'High' } });
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledWith(
          expect.objectContaining({ priority: 'High' })
        );
      });
    });
  });

  describe('Date Handling', () => {
    it('should format dates correctly', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        // Check if date is formatted properly (assuming format like "Jan 15, 2024")
        expect(screen.getByText(/Jan \d{1,2}, \d{4}/)).toBeInTheDocument();
      });
    });

    it('should handle date range filtering', async () => {
      renderWithProviders(<Repairs />);
      
      await waitFor(() => {
        expect(screen.getByText('Date Range')).toBeInTheDocument();
      });
      
      const startDateInput = screen.getByLabelText('Start Date');
      const endDateInput = screen.getByLabelText('End Date');
      
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
      fireEvent.change(endDateInput, { target: { value: '2024-01-31' } });
      
      await waitFor(() => {
        expect(mockAPI.repairsAPI.getTickets).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate: '2024-01-01',
            endDate: '2024-01-31'
          })
        );
      });
    });
  });
});
