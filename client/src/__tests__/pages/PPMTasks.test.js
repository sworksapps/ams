import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockApiResponses } from '../utils/testUtils';
import PPMTasks from '../../pages/PPMTasks';
import * as api from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api');
const mockAPI = api;

describe('PPMTasks Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    mockAPI.maintenanceAPI = {
      getExternalTasks: jest.fn().mockResolvedValue(mockApiResponses.ppmTasks.success.data),
      getKPIs: jest.fn().mockResolvedValue(mockApiResponses.ppmTasks.success.data.kpis),
      getStatusOptions: jest.fn().mockResolvedValue(['Open', 'In Progress', 'Closed']),
      getLocationOptions: jest.fn().mockResolvedValue(['Mumbai - Andheri', 'Delhi - CP'])
    };
  });

  describe('Rendering', () => {
    it('should render PPM tasks title', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('PPM Tasks')).toBeInTheDocument();
      });
    });

    it('should render KPI cards', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Tasks')).toBeInTheDocument();
        expect(screen.getByText('Open Tasks')).toBeInTheDocument();
        expect(screen.getByText('Critical Tasks')).toBeInTheDocument();
        expect(screen.getByText('Past Due')).toBeInTheDocument();
        expect(screen.getByText('Closed Tasks')).toBeInTheDocument();
      });
    });

    it('should render tasks table', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Task Name')).toBeInTheDocument();
        expect(screen.getByText('Asset')).toBeInTheDocument();
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Due Date')).toBeInTheDocument();
        expect(screen.getByText('Priority')).toBeInTheDocument();
      });
    });

    it('should render filter controls', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
        expect(screen.getByText('All Locations')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should show loading state initially', () => {
      mockAPI.maintenanceAPI.getExternalTasks.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<PPMTasks />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load PPM tasks data on mount', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getExternalTasks).toHaveBeenCalledTimes(1);
        expect(mockAPI.maintenanceAPI.getStatusOptions).toHaveBeenCalledTimes(1);
        expect(mockAPI.maintenanceAPI.getLocationOptions).toHaveBeenCalledTimes(1);
      });
    });

    it('should display task data correctly', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Monthly HVAC Check')).toBeInTheDocument();
        expect(screen.getByText('AC Unit 1')).toBeInTheDocument();
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
      });
    });

    it('should display KPI values correctly', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total tasks
        expect(screen.getByText('45')).toBeInTheDocument(); // Open tasks
        expect(screen.getByText('12')).toBeInTheDocument(); // Critical tasks
        expect(screen.getByText('8')).toBeInTheDocument(); // Past due
        expect(screen.getByText('85')).toBeInTheDocument(); // Closed tasks
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAPI.maintenanceAPI.getExternalTasks.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText(/error loading PPM tasks/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockAPI.maintenanceAPI.getExternalTasks.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading data when retry button is clicked', async () => {
      mockAPI.maintenanceAPI.getExternalTasks
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockApiResponses.ppmTasks.success.data);
      
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getExternalTasks).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter tasks by search term', async () => {
      const mockTasks = {
        tasks: [
          {
            id: 1,
            task_name: 'HVAC Maintenance',
            asset_name: 'AC Unit 1',
            location: 'Mumbai - Andheri',
            status: 'Open',
            due_date: '2024-02-15',
            priority: 'High'
          },
          {
            id: 2,
            task_name: 'Electrical Check',
            asset_name: 'Generator 1',
            location: 'Delhi - CP',
            status: 'Open',
            due_date: '2024-02-20',
            priority: 'Medium'
          }
        ],
        total: 2,
        kpis: mockApiResponses.ppmTasks.success.data.kpis
      };
      
      mockAPI.maintenanceAPI.getExternalTasks.mockResolvedValue(mockTasks);
      
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('HVAC Maintenance')).toBeInTheDocument();
        expect(screen.getByText('Electrical Check')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      fireEvent.change(searchInput, { target: { value: 'HVAC' } });
      
      await waitFor(() => {
        expect(screen.getByText('HVAC Maintenance')).toBeInTheDocument();
        expect(screen.queryByText('Electrical Check')).not.toBeInTheDocument();
      });
    });

    it('should filter tasks by status', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
      
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusFilter, { target: { value: 'Open' } });
      
      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getExternalTasks).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Open' })
        );
      });
    });

    it('should filter tasks by location', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('All Locations')).toBeInTheDocument();
      });
      
      const locationFilter = screen.getByDisplayValue('All Locations');
      fireEvent.change(locationFilter, { target: { value: 'Mumbai - Andheri' } });
      
      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getExternalTasks).toHaveBeenCalledWith(
          expect.objectContaining({ location: 'Mumbai - Andheri' })
        );
      });
    });

    it('should show active filter count', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
      
      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      fireEvent.change(searchInput, { target: { value: 'HVAC' } });
      
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusFilter, { target: { value: 'Open' } });
      
      await waitFor(() => {
        expect(screen.getByText('2 active')).toBeInTheDocument();
      });
    });

    it('should clear all filters when clear button is clicked', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
      
      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      fireEvent.change(searchInput, { target: { value: 'HVAC' } });
      
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
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Open Tasks')).toBeInTheDocument();
      });
      
      const openTasksCard = screen.getByText('Open Tasks').closest('.kpi-card');
      fireEvent.click(openTasksCard);
      
      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getExternalTasks).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Open' })
        );
      });
    });

    it('should show visual feedback when KPI card is active', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Open Tasks')).toBeInTheDocument();
      });
      
      const openTasksCard = screen.getByText('Open Tasks').closest('.kpi-card');
      fireEvent.click(openTasksCard);
      
      await waitFor(() => {
        expect(openTasksCard).toHaveClass('ring-2', 'ring-blue-500');
      });
    });
  });

  describe('Table Interactions', () => {
    it('should sort table by column when header is clicked', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Task Name')).toBeInTheDocument();
      });
      
      const taskNameHeader = screen.getByText('Task Name');
      fireEvent.click(taskNameHeader);
      
      // Check that sorting indicator is present
      expect(taskNameHeader.closest('th')).toHaveAttribute('aria-sort');
    });

    it('should show task details when row is clicked', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Monthly HVAC Check')).toBeInTheDocument();
      });
      
      const taskRow = screen.getByText('Monthly HVAC Check').closest('tr');
      fireEvent.click(taskRow);
      
      await waitFor(() => {
        expect(screen.getByText('Task Details')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Mock large dataset for pagination testing
      const largeTaskset = {
        tasks: Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          task_name: `Task ${i + 1}`,
          asset_name: `Asset ${i + 1}`,
          location: i % 2 === 0 ? 'Mumbai - Andheri' : 'Delhi - CP',
          status: i % 3 === 0 ? 'Open' : 'Closed',
          due_date: '2024-02-15',
          priority: i % 2 === 0 ? 'High' : 'Medium'
        })),
        total: 25,
        kpis: mockApiResponses.ppmTasks.success.data.kpis
      };
      mockAPI.maintenanceAPI.getExternalTasks.mockResolvedValue(largeTaskset);
    });

    it('should show pagination controls when there are multiple pages', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should navigate to next page when next button is clicked', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText('Task 21')).toBeInTheDocument();
      });
    });

    it('should update page size when page size selector is changed', async () => {
      renderWithProviders(<PPMTasks />);
      
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

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getExternalTasks).toHaveBeenCalledTimes(1);
      });
      
      const refreshButton = screen.getByTitle('Refresh data');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockAPI.maintenanceAPI.getExternalTasks).toHaveBeenCalledTimes(2);
      });
    });

    it('should show loading state during refresh', async () => {
      mockAPI.maintenanceAPI.getExternalTasks
        .mockResolvedValueOnce(mockApiResponses.ppmTasks.success.data)
        .mockImplementationOnce(() => new Promise(() => {}));
      
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Monthly HVAC Check')).toBeInTheDocument();
      });
      
      const refreshButton = screen.getByTitle('Refresh data');
      fireEvent.click(refreshButton);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
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
      
      renderWithProviders(<PPMTasks />);
      
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
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Search PPM tasks')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by location')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Monthly HVAC Check')).toBeInTheDocument();
      });
      
      const taskRow = screen.getByText('Monthly HVAC Check').closest('tr');
      
      // Test Enter key
      fireEvent.keyDown(taskRow, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Task Details')).toBeInTheDocument();
      });
    });

    it('should have proper table headers with sorting capabilities', async () => {
      renderWithProviders(<PPMTasks />);
      
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
    it('should show empty state when no tasks are available', async () => {
      mockAPI.maintenanceAPI.getExternalTasks.mockResolvedValue({
        tasks: [],
        total: 0,
        kpis: { total: 0, open: 0, critical: 0, pastDue: 0, closed: 0 }
      });
      
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('No PPM tasks found')).toBeInTheDocument();
        expect(screen.getByText('There are currently no PPM tasks matching your criteria.')).toBeInTheDocument();
      });
    });

    it('should show empty state with appropriate message when filters yield no results', async () => {
      mockAPI.maintenanceAPI.getExternalTasks
        .mockResolvedValueOnce(mockApiResponses.ppmTasks.success.data)
        .mockResolvedValueOnce({
          tasks: [],
          total: 0,
          kpis: { total: 0, open: 0, critical: 0, pastDue: 0, closed: 0 }
        });
      
      renderWithProviders(<PPMTasks />);
      
      await waitFor(() => {
        expect(screen.getByText('Monthly HVAC Check')).toBeInTheDocument();
      });
      
      // Apply filter that yields no results
      const searchInput = screen.getByPlaceholderText('Search tasks...');
      fireEvent.change(searchInput, { target: { value: 'NonExistentTask' } });
      
      await waitFor(() => {
        expect(screen.getByText('No PPM tasks found matching your criteria')).toBeInTheDocument();
      });
    });
  });
});
