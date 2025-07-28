import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders, mockApiResponses } from '../utils/testUtils';
import AMCRenewals from '../../pages/AMCRenewals';
import * as api from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api');
const mockAPI = api;

describe('AMCRenewals Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    mockAPI.amcRenewalAPI = {
      getExternalTickets: jest.fn().mockResolvedValue(mockApiResponses.amcRenewals.success.data),
      getKPIs: jest.fn().mockResolvedValue(mockApiResponses.amcRenewals.success.data.kpis),
      getStatusOptions: jest.fn().mockResolvedValue(['Open', 'In Progress', 'Closed']),
      getLocationOptions: jest.fn().mockResolvedValue(['Mumbai - Andheri', 'Delhi - CP']),
      createTicket: jest.fn().mockResolvedValue({ id: 1, ticket_number: 'AMC001' }),
      autoGenerate: jest.fn().mockResolvedValue({ created: 5, skipped: 2 })
    };
  });

  describe('Rendering', () => {
    it('should render AMC renewals title', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('AMC Renewals')).toBeInTheDocument();
      });
    });

    it('should render KPI cards', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Total Tickets')).toBeInTheDocument();
        expect(screen.getByText('Open Tickets')).toBeInTheDocument();
        expect(screen.getByText('Critical Tickets')).toBeInTheDocument();
        expect(screen.getByText('Past Due')).toBeInTheDocument();
        expect(screen.getByText('Closed Tickets')).toBeInTheDocument();
      });
    });

    it('should render tickets table', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Ticket Number')).toBeInTheDocument();
        expect(screen.getByText('Asset')).toBeInTheDocument();
        expect(screen.getByText('Location')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Expiry Date')).toBeInTheDocument();
      });
    });

    it('should render filter controls', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search tickets...')).toBeInTheDocument();
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
        expect(screen.getByText('All Locations')).toBeInTheDocument();
      });
    });

    it('should render action buttons', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Ticket')).toBeInTheDocument();
        expect(screen.getByText('Auto Generate')).toBeInTheDocument();
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should show loading state initially', () => {
      mockAPI.amcRenewalAPI.getExternalTickets.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<AMCRenewals />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should load AMC renewal data on mount', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.getExternalTickets).toHaveBeenCalledTimes(1);
        expect(mockAPI.amcRenewalAPI.getStatusOptions).toHaveBeenCalledTimes(1);
        expect(mockAPI.amcRenewalAPI.getLocationOptions).toHaveBeenCalledTimes(1);
      });
    });

    it('should display ticket data correctly', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('AMC001')).toBeInTheDocument();
        expect(screen.getByText('Test Equipment')).toBeInTheDocument();
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
      });
    });

    it('should display KPI values correctly', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument(); // Total tickets
        expect(screen.getByText('25')).toBeInTheDocument(); // Open tickets
        expect(screen.getByText('5')).toBeInTheDocument(); // Critical tickets
        expect(screen.getByText('3')).toBeInTheDocument(); // Past due
        expect(screen.getByText('67')).toBeInTheDocument(); // Closed tickets
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockAPI.amcRenewalAPI.getExternalTickets.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText(/error loading AMC renewal tickets/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      mockAPI.amcRenewalAPI.getExternalTickets.mockRejectedValue(new Error('API Error'));
      
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should retry loading data when retry button is clicked', async () => {
      mockAPI.amcRenewalAPI.getExternalTickets
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockApiResponses.amcRenewals.success.data);
      
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.getExternalTickets).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Filtering and Search', () => {
    it('should filter tickets by search term', async () => {
      const mockTickets = {
        tickets: [
          {
            id: 1,
            ticket_number: 'AMC001',
            asset_name: 'HVAC Unit 1',
            location: 'Mumbai - Andheri',
            status: 'Open',
            expiry_date: '2024-03-15'
          },
          {
            id: 2,
            ticket_number: 'AMC002',
            asset_name: 'Generator 1',
            location: 'Delhi - CP',
            status: 'Open',
            expiry_date: '2024-04-20'
          }
        ],
        total: 2,
        kpis: mockApiResponses.amcRenewals.success.data.kpis
      };
      
      mockAPI.amcRenewalAPI.getExternalTickets.mockResolvedValue(mockTickets);
      
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('HVAC Unit 1')).toBeInTheDocument();
        expect(screen.getByText('Generator 1')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search tickets...');
      fireEvent.change(searchInput, { target: { value: 'HVAC' } });
      
      await waitFor(() => {
        expect(screen.getByText('HVAC Unit 1')).toBeInTheDocument();
        expect(screen.queryByText('Generator 1')).not.toBeInTheDocument();
      });
    });

    it('should filter tickets by status', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
      
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusFilter, { target: { value: 'Open' } });
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.getExternalTickets).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Open' })
        );
      });
    });

    it('should filter tickets by location', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('All Locations')).toBeInTheDocument();
      });
      
      const locationFilter = screen.getByDisplayValue('All Locations');
      fireEvent.change(locationFilter, { target: { value: 'Mumbai - Andheri' } });
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.getExternalTickets).toHaveBeenCalledWith(
          expect.objectContaining({ location: 'Mumbai - Andheri' })
        );
      });
    });

    it('should show active filter count', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
      
      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search tickets...');
      fireEvent.change(searchInput, { target: { value: 'AMC' } });
      
      const statusFilter = screen.getByDisplayValue('All Statuses');
      fireEvent.change(statusFilter, { target: { value: 'Open' } });
      
      await waitFor(() => {
        expect(screen.getByText('2 active')).toBeInTheDocument();
      });
    });

    it('should clear all filters when clear button is clicked', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('All Statuses')).toBeInTheDocument();
      });
      
      // Apply filters
      const searchInput = screen.getByPlaceholderText('Search tickets...');
      fireEvent.change(searchInput, { target: { value: 'AMC' } });
      
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
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Open Tickets')).toBeInTheDocument();
      });
      
      const openTicketsCard = screen.getByText('Open Tickets').closest('.kpi-card');
      fireEvent.click(openTicketsCard);
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.getExternalTickets).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'Open' })
        );
      });
    });

    it('should show visual feedback when KPI card is active', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Open Tickets')).toBeInTheDocument();
      });
      
      const openTicketsCard = screen.getByText('Open Tickets').closest('.kpi-card');
      fireEvent.click(openTicketsCard);
      
      await waitFor(() => {
        expect(openTicketsCard).toHaveClass('ring-2', 'ring-blue-500');
      });
    });
  });

  describe('Ticket Creation', () => {
    it('should open create ticket modal when create button is clicked', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Ticket')).toBeInTheDocument();
      });
      
      const createButton = screen.getByText('Create Ticket');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create AMC Renewal Ticket')).toBeInTheDocument();
      });
    });

    it('should create ticket when form is submitted', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Ticket')).toBeInTheDocument();
      });
      
      const createButton = screen.getByText('Create Ticket');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create AMC Renewal Ticket')).toBeInTheDocument();
      });
      
      // Fill form
      const assetSelect = screen.getByLabelText('Asset');
      fireEvent.change(assetSelect, { target: { value: '1' } });
      
      const expiryDateInput = screen.getByLabelText('Expiry Date');
      fireEvent.change(expiryDateInput, { target: { value: '2024-12-31' } });
      
      // Submit form
      const submitButton = screen.getByText('Create Ticket');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.createTicket).toHaveBeenCalledWith({
          asset_id: '1',
          expiry_date: '2024-12-31'
        });
      });
    });

    it('should close modal after successful ticket creation', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Ticket')).toBeInTheDocument();
      });
      
      const createButton = screen.getByText('Create Ticket');
      fireEvent.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByText('Create AMC Renewal Ticket')).toBeInTheDocument();
      });
      
      // Fill and submit form
      const assetSelect = screen.getByLabelText('Asset');
      fireEvent.change(assetSelect, { target: { value: '1' } });
      
      const submitButton = screen.getByText('Create Ticket');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Create AMC Renewal Ticket')).not.toBeInTheDocument();
      });
    });
  });

  describe('Auto Generation', () => {
    it('should trigger auto generation when auto generate button is clicked', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Auto Generate')).toBeInTheDocument();
      });
      
      const autoGenerateButton = screen.getByText('Auto Generate');
      fireEvent.click(autoGenerateButton);
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.autoGenerate).toHaveBeenCalledTimes(1);
      });
    });

    it('should show success message after auto generation', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Auto Generate')).toBeInTheDocument();
      });
      
      const autoGenerateButton = screen.getByText('Auto Generate');
      fireEvent.click(autoGenerateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/5 tickets created, 2 skipped/i)).toBeInTheDocument();
      });
    });

    it('should refresh data after auto generation', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.getExternalTickets).toHaveBeenCalledTimes(1);
      });
      
      const autoGenerateButton = screen.getByText('Auto Generate');
      fireEvent.click(autoGenerateButton);
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.getExternalTickets).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Table Interactions', () => {
    it('should sort table by column when header is clicked', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Ticket Number')).toBeInTheDocument();
      });
      
      const ticketNumberHeader = screen.getByText('Ticket Number');
      fireEvent.click(ticketNumberHeader);
      
      // Check that sorting indicator is present
      expect(ticketNumberHeader.closest('th')).toHaveAttribute('aria-sort');
    });

    it('should show ticket details when row is clicked', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('AMC001')).toBeInTheDocument();
      });
      
      const ticketRow = screen.getByText('AMC001').closest('tr');
      fireEvent.click(ticketRow);
      
      await waitFor(() => {
        expect(screen.getByText('Ticket Details')).toBeInTheDocument();
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
      
      renderWithProviders(<AMCRenewals />);
      
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
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.getExternalTickets).toHaveBeenCalledTimes(1);
      });
      
      const refreshButton = screen.getByTitle('Refresh data');
      fireEvent.click(refreshButton);
      
      await waitFor(() => {
        expect(mockAPI.amcRenewalAPI.getExternalTickets).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Search AMC renewal tickets')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter by location')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Ticket')).toBeInTheDocument();
      });
      
      const createButton = screen.getByText('Create Ticket');
      
      // Test Enter key
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Create AMC Renewal Ticket')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no tickets are available', async () => {
      mockAPI.amcRenewalAPI.getExternalTickets.mockResolvedValue({
        tickets: [],
        total: 0,
        kpis: { total: 0, open: 0, critical: 0, pastDue: 0, closed: 0 }
      });
      
      renderWithProviders(<AMCRenewals />);
      
      await waitFor(() => {
        expect(screen.getByText('No AMC renewal tickets found')).toBeInTheDocument();
        expect(screen.getByText('There are currently no AMC renewal tickets matching your criteria.')).toBeInTheDocument();
      });
    });
  });
});
