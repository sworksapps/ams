import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockApiResponses } from '../utils/testUtils';
import TicketDetails from '../../pages/TicketDetails';
import * as api from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api');
const mockAPI = api;

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockParams = { id: '123' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams
}));

// Mock file upload and download
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();
const mockDownload = jest.fn();
global.document.createElement = jest.fn(() => ({
  href: '',
  download: '',
  click: mockDownload,
  style: {}
}));

const mockTicketDetails = {
  id: 123,
  ticket_number: 'TKT-2024-001',
  title: 'AC Maintenance Required',
  description: 'Monthly filter cleaning and inspection',
  status: 'Open',
  priority: 'Medium',
  category: 'PPM',
  subcategory: 'HVAC',
  asset_id: 1,
  asset_name: 'Air Conditioner 1',
  location: 'Mumbai - Andheri',
  assigned_to: 'John Doe',
  created_by: 'Admin User',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  due_date: '2024-01-20T18:00:00Z',
  completion_date: null,
  estimated_hours: 2,
  actual_hours: null,
  cost: 500,
  vendor: 'HVAC Services Ltd',
  notes: 'Regular maintenance schedule',
  attachments: [
    {
      id: 1,
      filename: 'maintenance_checklist.pdf',
      original_name: 'Maintenance Checklist.pdf',
      file_size: 1024000,
      mime_type: 'application/pdf',
      uploaded_at: '2024-01-15T10:30:00Z'
    }
  ]
};

const mockComments = [
  {
    id: 1,
    ticket_id: 123,
    user_name: 'John Doe',
    comment: 'Started working on this ticket',
    created_at: '2024-01-15T11:00:00Z',
    attachments: []
  },
  {
    id: 2,
    ticket_id: 123,
    user_name: 'Admin User',
    comment: 'Please prioritize this task',
    created_at: '2024-01-15T12:00:00Z',
    attachments: [
      {
        id: 2,
        filename: 'priority_note.jpg',
        original_name: 'Priority Note.jpg',
        file_size: 512000,
        mime_type: 'image/jpeg'
      }
    ]
  }
];

const mockStatusHistory = [
  {
    id: 1,
    ticket_id: 123,
    old_status: null,
    new_status: 'Open',
    changed_by: 'Admin User',
    changed_at: '2024-01-15T10:00:00Z',
    notes: 'Ticket created'
  },
  {
    id: 2,
    ticket_id: 123,
    old_status: 'Open',
    new_status: 'In Progress',
    changed_by: 'John Doe',
    changed_at: '2024-01-15T11:00:00Z',
    notes: 'Started working on the task'
  }
];

describe('TicketDetails Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default API mocks
    mockAPI.ticketsAPI = {
      getTicketDetails: jest.fn().mockResolvedValue(mockTicketDetails),
      updateTicket: jest.fn().mockResolvedValue({ message: 'Ticket updated successfully' }),
      deleteTicket: jest.fn().mockResolvedValue({ message: 'Ticket deleted successfully' }),
      getComments: jest.fn().mockResolvedValue(mockComments),
      addComment: jest.fn().mockResolvedValue({ 
        id: 3, 
        comment: 'New comment', 
        user_name: 'Current User',
        created_at: new Date().toISOString()
      }),
      getStatusHistory: jest.fn().mockResolvedValue(mockStatusHistory),
      downloadAttachment: jest.fn().mockResolvedValue(new Blob(['file content'])),
      uploadAttachment: jest.fn().mockResolvedValue({ 
        id: 3, 
        filename: 'new_file.pdf',
        original_name: 'New File.pdf'
      })
    };
  });

  describe('Rendering', () => {
    it('should render ticket details page', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('TKT-2024-001')).toBeInTheDocument();
        expect(screen.getByText('AC Maintenance Required')).toBeInTheDocument();
        expect(screen.getByText('Monthly filter cleaning and inspection')).toBeInTheDocument();
      });
    });

    it('should render ticket status and priority', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
        expect(screen.getByText('PPM')).toBeInTheDocument();
      });
    });

    it('should render asset and location information', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Air Conditioner 1')).toBeInTheDocument();
        expect(screen.getByText('Mumbai - Andheri')).toBeInTheDocument();
      });
    });

    it('should render assignment and timing information', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Admin User')).toBeInTheDocument();
        expect(screen.getByText('2 hours')).toBeInTheDocument();
        expect(screen.getByText('₹500')).toBeInTheDocument();
      });
    });

    it('should render attachments section', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Attachments')).toBeInTheDocument();
        expect(screen.getByText('Maintenance Checklist.pdf')).toBeInTheDocument();
        expect(screen.getByText('1.00 MB')).toBeInTheDocument();
      });
    });

    it('should render tabs for different sections', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Details')).toBeInTheDocument();
        expect(screen.getByText('Comments')).toBeInTheDocument();
        expect(screen.getByText('History')).toBeInTheDocument();
        expect(screen.getByText('Attachments')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should show loading state initially', () => {
      mockAPI.ticketsAPI.getTicketDetails.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<TicketDetails />);
      
      expect(screen.getByText('Loading ticket details...')).toBeInTheDocument();
    });

    it('should load ticket details on mount', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(mockAPI.ticketsAPI.getTicketDetails).toHaveBeenCalledWith('123');
        expect(mockAPI.ticketsAPI.getComments).toHaveBeenCalledWith('123');
        expect(mockAPI.ticketsAPI.getStatusHistory).toHaveBeenCalledWith('123');
      });
    });

    it('should handle API errors gracefully', async () => {
      mockAPI.ticketsAPI.getTicketDetails.mockRejectedValue(new Error('Ticket not found'));
      
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Error loading ticket details')).toBeInTheDocument();
        expect(screen.getByText('Ticket not found')).toBeInTheDocument();
      });
    });

    it('should provide retry functionality on error', async () => {
      mockAPI.ticketsAPI.getTicketDetails.mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTicketDetails);
      
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('Retry'));
      
      await waitFor(() => {
        expect(mockAPI.ticketsAPI.getTicketDetails).toHaveBeenCalledTimes(2);
        expect(screen.getByText('TKT-2024-001')).toBeInTheDocument();
      });
    });
  });

  describe('Ticket Status Management', () => {
    it('should update ticket status', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Open')).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue('Open');
      fireEvent.change(statusSelect, { target: { value: 'In Progress' } });

      const updateButton = screen.getByText('Update Status');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockAPI.ticketsAPI.updateTicket).toHaveBeenCalledWith('123', 
          expect.objectContaining({ status: 'In Progress' })
        );
      });
    });

    it('should update ticket priority', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Medium')).toBeInTheDocument();
      });

      const prioritySelect = screen.getByDisplayValue('Medium');
      fireEvent.change(prioritySelect, { target: { value: 'High' } });

      const updateButton = screen.getByText('Update Priority');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockAPI.ticketsAPI.updateTicket).toHaveBeenCalledWith('123', 
          expect.objectContaining({ priority: 'High' })
        );
      });
    });

    it('should assign ticket to user', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const assignSelect = screen.getByDisplayValue('John Doe');
      fireEvent.change(assignSelect, { target: { value: 'Jane Smith' } });

      const assignButton = screen.getByText('Assign');
      fireEvent.click(assignButton);

      await waitFor(() => {
        expect(mockAPI.ticketsAPI.updateTicket).toHaveBeenCalledWith('123', 
          expect.objectContaining({ assigned_to: 'Jane Smith' })
        );
      });
    });

    it('should handle status update errors', async () => {
      mockAPI.ticketsAPI.updateTicket.mockRejectedValue(new Error('Update failed'));
      
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Open')).toBeInTheDocument();
      });

      const statusSelect = screen.getByDisplayValue('Open');
      fireEvent.change(statusSelect, { target: { value: 'Closed' } });

      const updateButton = screen.getByText('Update Status');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update ticket status')).toBeInTheDocument();
      });
    });
  });

  describe('Comments Section', () => {
    it('should display existing comments', async () => {
      renderWithProviders(<TicketDetails />);
      
      // Switch to comments tab
      fireEvent.click(screen.getByText('Comments'));
      
      await waitFor(() => {
        expect(screen.getByText('Started working on this ticket')).toBeInTheDocument();
        expect(screen.getByText('Please prioritize this task')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should add new comment', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Comments'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
      });

      const commentInput = screen.getByPlaceholderText('Add a comment...');
      await user.type(commentInput, 'This is a new comment');

      const addButton = screen.getByText('Add Comment');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockAPI.ticketsAPI.addComment).toHaveBeenCalledWith('123', {
          comment: 'This is a new comment',
          attachments: []
        });
      });
    });

    it('should validate comment input', async () => {
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Comments'));
      
      await waitFor(() => {
        expect(screen.getByText('Add Comment')).toBeInTheDocument();
      });

      // Try to add empty comment
      const addButton = screen.getByText('Add Comment');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Comment cannot be empty')).toBeInTheDocument();
      });
    });

    it('should handle comment addition errors', async () => {
      mockAPI.ticketsAPI.addComment.mockRejectedValue(new Error('Failed to add comment'));
      
      const user = userEvent.setup();
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Comments'));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
      });

      const commentInput = screen.getByPlaceholderText('Add a comment...');
      await user.type(commentInput, 'Test comment');

      const addButton = screen.getByText('Add Comment');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to add comment')).toBeInTheDocument();
      });
    });

    it('should display comment timestamps correctly', async () => {
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Comments'));
      
      await waitFor(() => {
        // Should show relative time
        expect(screen.getByText(/ago/)).toBeInTheDocument();
      });
    });
  });

  describe('Status History', () => {
    it('should display status history', async () => {
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('History'));
      
      await waitFor(() => {
        expect(screen.getByText('Ticket created')).toBeInTheDocument();
        expect(screen.getByText('Started working on the task')).toBeInTheDocument();
        expect(screen.getByText('Open → In Progress')).toBeInTheDocument();
      });
    });

    it('should show history in chronological order', async () => {
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('History'));
      
      await waitFor(() => {
        const historyItems = screen.getAllByTestId('history-item');
        expect(historyItems).toHaveLength(2);
        
        // Most recent should be first
        expect(within(historyItems[0]).getByText('Started working on the task')).toBeInTheDocument();
        expect(within(historyItems[1]).getByText('Ticket created')).toBeInTheDocument();
      });
    });

    it('should handle empty history', async () => {
      mockAPI.ticketsAPI.getStatusHistory.mockResolvedValue([]);
      
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('History'));
      
      await waitFor(() => {
        expect(screen.getByText('No status changes recorded')).toBeInTheDocument();
      });
    });
  });

  describe('Attachments Management', () => {
    it('should display existing attachments', async () => {
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Attachments'));
      
      await waitFor(() => {
        expect(screen.getByText('Maintenance Checklist.pdf')).toBeInTheDocument();
        expect(screen.getByText('1.00 MB')).toBeInTheDocument();
      });
    });

    it('should download attachment when clicked', async () => {
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Attachments'));
      
      await waitFor(() => {
        expect(screen.getByText('Maintenance Checklist.pdf')).toBeInTheDocument();
      });

      const downloadButton = screen.getByLabelText('Download attachment');
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockAPI.ticketsAPI.downloadAttachment).toHaveBeenCalledWith(1);
      });
    });

    it('should upload new attachment', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Attachments'));
      
      await waitFor(() => {
        expect(screen.getByText('Upload Files')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Upload files');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockAPI.ticketsAPI.uploadAttachment).toHaveBeenCalledWith('123', expect.any(FormData));
      });
    });

    it('should validate file size and type', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      });
      
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Attachments'));
      
      const fileInput = screen.getByLabelText('Upload files');
      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument();
      });
    });

    it('should handle attachment upload errors', async () => {
      mockAPI.ticketsAPI.uploadAttachment.mockRejectedValue(new Error('Upload failed'));
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Attachments'));
      
      const fileInput = screen.getByLabelText('Upload files');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText('Failed to upload file')).toBeInTheDocument();
      });
    });
  });

  describe('Ticket Actions', () => {
    it('should delete ticket when delete button is clicked', async () => {
      window.confirm = jest.fn(() => true);
      
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Delete Ticket')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete Ticket'));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith(
          'Are you sure you want to delete this ticket? This action cannot be undone.'
        );
        expect(mockAPI.ticketsAPI.deleteTicket).toHaveBeenCalledWith('123');
      });
    });

    it('should not delete ticket when confirmation is cancelled', async () => {
      window.confirm = jest.fn(() => false);
      
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Delete Ticket')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete Ticket'));

      expect(window.confirm).toHaveBeenCalled();
      expect(mockAPI.ticketsAPI.deleteTicket).not.toHaveBeenCalled();
    });

    it('should navigate back when back button is clicked', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('← Back')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('← Back'));

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should print ticket when print button is clicked', async () => {
      window.print = jest.fn();
      
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Print')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Print'));

      expect(window.print).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Ticket status')).toBeInTheDocument();
        expect(screen.getByLabelText('Ticket priority')).toBeInTheDocument();
        expect(screen.getByLabelText('Assigned to')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Comments')).toBeInTheDocument();
      });

      const commentsTab = screen.getByText('Comments');
      
      // Test Enter key
      fireEvent.keyDown(commentsTab, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
      });
    });

    it('should have proper heading hierarchy', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      });
    });

    it('should provide screen reader friendly content', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('Ticket TKT-2024-001')).toBeInTheDocument();
        expect(screen.getByText('Status: Open')).toBeInTheDocument();
        expect(screen.getByText('Priority: Medium')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile viewport', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByText('TKT-2024-001')).toBeInTheDocument();
      });
      
      // Check that mobile-specific classes are applied
      const container = screen.getByTestId('ticket-details-container');
      expect(container).toHaveClass('px-4'); // Mobile padding
    });

    it('should stack information vertically on small screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640
      });
      
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        const infoGrid = screen.getByTestId('ticket-info-grid');
        expect(infoGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2');
      });
    });
  });

  describe('Performance', () => {
    it('should handle large comment lists efficiently', async () => {
      const manyComments = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        ticket_id: 123,
        user_name: `User ${i}`,
        comment: `Comment ${i}`,
        created_at: new Date().toISOString(),
        attachments: []
      }));

      mockAPI.ticketsAPI.getComments.mockResolvedValue(manyComments);
      
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Comments'));
      
      await waitFor(() => {
        expect(screen.getByText('Comment 0')).toBeInTheDocument();
      });
      
      // Should still be responsive
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });

    it('should handle large attachment lists', async () => {
      const manyAttachments = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        filename: `file_${i}.pdf`,
        original_name: `File ${i}.pdf`,
        file_size: 1024000,
        mime_type: 'application/pdf',
        uploaded_at: new Date().toISOString()
      }));

      const ticketWithManyAttachments = {
        ...mockTicketDetails,
        attachments: manyAttachments
      };

      mockAPI.ticketsAPI.getTicketDetails.mockResolvedValue(ticketWithManyAttachments);
      
      renderWithProviders(<TicketDetails />);
      
      fireEvent.click(screen.getByText('Attachments'));
      
      await waitFor(() => {
        expect(screen.getByText('File 0.pdf')).toBeInTheDocument();
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate due date is in the future', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Due date')).toBeInTheDocument();
      });

      const dueDateInput = screen.getByLabelText('Due date');
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      fireEvent.change(dueDateInput, { 
        target: { value: pastDate.toISOString().split('T')[0] } 
      });

      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Due date cannot be in the past')).toBeInTheDocument();
      });
    });

    it('should validate estimated hours is positive', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Estimated hours')).toBeInTheDocument();
      });

      const hoursInput = screen.getByLabelText('Estimated hours');
      fireEvent.change(hoursInput, { target: { value: '-1' } });

      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Estimated hours must be positive')).toBeInTheDocument();
      });
    });

    it('should validate cost is non-negative', async () => {
      renderWithProviders(<TicketDetails />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Cost')).toBeInTheDocument();
      });

      const costInput = screen.getByLabelText('Cost');
      fireEvent.change(costInput, { target: { value: '-100' } });

      const updateButton = screen.getByText('Update');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Cost cannot be negative')).toBeInTheDocument();
      });
    });
  });
});
