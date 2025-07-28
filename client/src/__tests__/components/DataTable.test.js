import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/testUtils';
import DataTable from '../../components/DataTable/DataTable';

// Mock data for testing
const mockColumns = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ getValue }) => getValue()
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ getValue }) => getValue()
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => (
      <span className={`badge ${getValue() === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
        {getValue()}
      </span>
    )
  },
  {
    accessorKey: 'createdAt',
    header: 'Created Date',
    cell: ({ getValue }) => new Date(getValue()).toLocaleDateString()
  }
];

const mockData = [
  {
    id: 1,
    name: 'Test Item 1',
    status: 'Active',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    name: 'Test Item 2',
    status: 'Inactive',
    createdAt: '2024-01-16T10:00:00Z'
  },
  {
    id: 3,
    name: 'Test Item 3',
    status: 'Active',
    createdAt: '2024-01-17T10:00:00Z'
  }
];

const defaultProps = {
  data: mockData,
  columns: mockColumns,
  loading: false,
  error: null
};

describe('DataTable Component', () => {
  describe('Rendering', () => {
    it('should render table with data', () => {
      renderWithProviders(<DataTable {...defaultProps} />);
      
      // Check headers
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Created Date')).toBeInTheDocument();
      
      // Check data
      expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      expect(screen.getByText('Test Item 2')).toBeInTheDocument();
      expect(screen.getByText('Test Item 3')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      renderWithProviders(<DataTable {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render error state', () => {
      const errorMessage = 'Failed to load data';
      renderWithProviders(<DataTable {...defaultProps} error={errorMessage} />);
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should render empty state when no data', () => {
      renderWithProviders(<DataTable {...defaultProps} data={[]} />);
      
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render custom empty message', () => {
      const customEmptyMessage = 'No items found';
      renderWithProviders(
        <DataTable 
          {...defaultProps} 
          data={[]} 
          emptyMessage={customEmptyMessage}
        />
      );
      
      expect(screen.getByText(customEmptyMessage)).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should sort data when column header is clicked', async () => {
      renderWithProviders(<DataTable {...defaultProps} />);
      
      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);
      
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // First row is header, so data starts from index 1
        expect(rows[1]).toHaveTextContent('Test Item 1');
      });
    });

    it('should toggle sort direction on multiple clicks', async () => {
      renderWithProviders(<DataTable {...defaultProps} />);
      
      const nameHeader = screen.getByText('Name');
      
      // First click - ascending
      fireEvent.click(nameHeader);
      await waitFor(() => {
        expect(nameHeader.closest('th')).toHaveAttribute('aria-sort', 'ascending');
      });
      
      // Second click - descending
      fireEvent.click(nameHeader);
      await waitFor(() => {
        expect(nameHeader.closest('th')).toHaveAttribute('aria-sort', 'descending');
      });
    });

    it('should show sort indicators', async () => {
      renderWithProviders(<DataTable {...defaultProps} />);
      
      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);
      
      await waitFor(() => {
        // Check for sort indicator (arrow or similar)
        const sortIndicator = nameHeader.closest('th').querySelector('[data-testid="sort-indicator"]');
        expect(sortIndicator).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    const paginatedProps = {
      ...defaultProps,
      pagination: true,
      pageSize: 2,
      totalCount: 10,
      currentPage: 1,
      onPageChange: jest.fn(),
      onPageSizeChange: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render pagination controls', () => {
      renderWithProviders(<DataTable {...paginatedProps} />);
      
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    });

    it('should call onPageChange when next button is clicked', () => {
      renderWithProviders(<DataTable {...paginatedProps} />);
      
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);
      
      expect(paginatedProps.onPageChange).toHaveBeenCalledWith(2);
    });

    it('should call onPageChange when previous button is clicked', () => {
      const props = { ...paginatedProps, currentPage: 2 };
      renderWithProviders(<DataTable {...props} />);
      
      const prevButton = screen.getByText('Previous');
      fireEvent.click(prevButton);
      
      expect(props.onPageChange).toHaveBeenCalledWith(1);
    });

    it('should disable previous button on first page', () => {
      renderWithProviders(<DataTable {...paginatedProps} />);
      
      const prevButton = screen.getByText('Previous');
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      const props = { ...paginatedProps, currentPage: 5 };
      renderWithProviders(<DataTable {...props} />);
      
      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('should render page size selector', () => {
      renderWithProviders(<DataTable {...paginatedProps} />);
      
      expect(screen.getByLabelText('Rows per page')).toBeInTheDocument();
    });

    it('should call onPageSizeChange when page size is changed', () => {
      renderWithProviders(<DataTable {...paginatedProps} />);
      
      const pageSizeSelect = screen.getByLabelText('Rows per page');
      fireEvent.change(pageSizeSelect, { target: { value: '10' } });
      
      expect(paginatedProps.onPageSizeChange).toHaveBeenCalledWith(10);
    });

    it('should show correct page information', () => {
      const props = { ...paginatedProps, currentPage: 2, pageSize: 2, totalCount: 10 };
      renderWithProviders(<DataTable {...props} />);
      
      expect(screen.getByText('Showing 3-4 of 10 results')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    const selectableProps = {
      ...defaultProps,
      enableRowSelection: true,
      onRowSelectionChange: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render selection checkboxes', () => {
      renderWithProviders(<DataTable {...selectableProps} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4); // 1 header + 3 data rows
    });

    it('should select all rows when header checkbox is clicked', () => {
      renderWithProviders(<DataTable {...selectableProps} />);
      
      const headerCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(headerCheckbox);
      
      expect(selectableProps.onRowSelectionChange).toHaveBeenCalledWith(['1', '2', '3']);
    });

    it('should select individual row when checkbox is clicked', () => {
      renderWithProviders(<DataTable {...selectableProps} />);
      
      const firstRowCheckbox = screen.getAllByRole('checkbox')[1];
      fireEvent.click(firstRowCheckbox);
      
      expect(selectableProps.onRowSelectionChange).toHaveBeenCalledWith(['1']);
    });

    it('should show selection count', () => {
      const props = { ...selectableProps, selectedRows: ['1', '2'] };
      renderWithProviders(<DataTable {...props} />);
      
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    const filterableProps = {
      ...defaultProps,
      enableGlobalFilter: true,
      globalFilter: '',
      onGlobalFilterChange: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render search input', () => {
      renderWithProviders(<DataTable {...filterableProps} />);
      
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should call onGlobalFilterChange when search input changes', () => {
      renderWithProviders(<DataTable {...filterableProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      expect(filterableProps.onGlobalFilterChange).toHaveBeenCalledWith('test');
    });

    it('should filter data based on search term', async () => {
      const props = { ...filterableProps, globalFilter: 'Item 1' };
      renderWithProviders(<DataTable {...props} />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.queryByText('Test Item 2')).not.toBeInTheDocument();
      });
    });
  });

  describe('Custom Cell Rendering', () => {
    it('should render custom cell components', () => {
      renderWithProviders(<DataTable {...defaultProps} />);
      
      const activeBadge = screen.getByText('Active');
      expect(activeBadge).toHaveClass('bg-green-100', 'text-green-800');
      
      const inactiveBadge = screen.getByText('Inactive');
      expect(inactiveBadge).toHaveClass('bg-gray-100', 'text-gray-800');
    });

    it('should format dates correctly', () => {
      renderWithProviders(<DataTable {...defaultProps} />);
      
      // Check if dates are formatted (assuming US format)
      expect(screen.getByText('1/15/2024')).toBeInTheDocument();
      expect(screen.getByText('1/16/2024')).toBeInTheDocument();
      expect(screen.getByText('1/17/2024')).toBeInTheDocument();
    });
  });

  describe('Row Actions', () => {
    const actionsProps = {
      ...defaultProps,
      onRowClick: jest.fn(),
      onRowDoubleClick: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call onRowClick when row is clicked', () => {
      renderWithProviders(<DataTable {...actionsProps} />);
      
      const firstRow = screen.getByText('Test Item 1').closest('tr');
      fireEvent.click(firstRow);
      
      expect(actionsProps.onRowClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('should call onRowDoubleClick when row is double-clicked', () => {
      renderWithProviders(<DataTable {...actionsProps} />);
      
      const firstRow = screen.getByText('Test Item 1').closest('tr');
      fireEvent.doubleClick(firstRow);
      
      expect(actionsProps.onRowDoubleClick).toHaveBeenCalledWith(mockData[0]);
    });

    it('should highlight row on hover', () => {
      renderWithProviders(<DataTable {...actionsProps} />);
      
      const firstRow = screen.getByText('Test Item 1').closest('tr');
      fireEvent.mouseEnter(firstRow);
      
      expect(firstRow).toHaveClass('hover:bg-gray-50');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<DataTable {...defaultProps} />);
      
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Data table');
    });

    it('should have proper column headers', () => {
      renderWithProviders(<DataTable {...defaultProps} />);
      
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(4);
      
      headers.forEach(header => {
        expect(header).toHaveAttribute('scope', 'col');
      });
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<DataTable {...defaultProps} />);
      
      const firstRow = screen.getByText('Test Item 1').closest('tr');
      expect(firstRow).toHaveAttribute('tabindex', '0');
    });

    it('should have proper sort button accessibility', () => {
      renderWithProviders(<DataTable {...defaultProps} />);
      
      const sortButton = screen.getByText('Name').closest('button');
      expect(sortButton).toHaveAttribute('aria-label', 'Sort by Name');
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile view', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderWithProviders(<DataTable {...defaultProps} />);
      
      // Check if table has mobile-responsive classes
      const table = screen.getByRole('table');
      expect(table.closest('div')).toHaveClass('overflow-x-auto');
    });

    it('should show/hide columns based on screen size', () => {
      const responsiveProps = {
        ...defaultProps,
        columns: mockColumns.map(col => ({
          ...col,
          meta: col.accessorKey === 'createdAt' ? { hideOnMobile: true } : undefined
        }))
      };
      
      renderWithProviders(<DataTable {...responsiveProps} />);
      
      const createdDateHeader = screen.queryByText('Created Date');
      // On mobile, this column should be hidden
      expect(createdDateHeader).toHaveClass('hidden', 'md:table-cell');
    });
  });

  describe('Export Functionality', () => {
    const exportProps = {
      ...defaultProps,
      enableExport: true,
      onExport: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render export button', () => {
      renderWithProviders(<DataTable {...exportProps} />);
      
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should call onExport when export button is clicked', () => {
      renderWithProviders(<DataTable {...exportProps} />);
      
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);
      
      expect(exportProps.onExport).toHaveBeenCalledWith(mockData);
    });

    it('should export selected rows only when rows are selected', () => {
      const props = { ...exportProps, selectedRows: ['1', '2'] };
      renderWithProviders(<DataTable {...props} />);
      
      const exportButton = screen.getByText('Export Selected');
      fireEvent.click(exportButton);
      
      expect(props.onExport).toHaveBeenCalledWith([mockData[0], mockData[1]]);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        status: i % 2 === 0 ? 'Active' : 'Inactive',
        createdAt: new Date(2024, 0, i + 1).toISOString()
      }));
      
      const start = performance.now();
      renderWithProviders(<DataTable {...defaultProps} data={largeData} />);
      const end = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(end - start).toBeLessThan(100);
    });

    it('should virtualize rows for large datasets', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        status: 'Active',
        createdAt: new Date().toISOString()
      }));
      
      const virtualizedProps = {
        ...defaultProps,
        data: largeData,
        enableVirtualization: true,
        height: 400
      };
      
      renderWithProviders(<DataTable {...virtualizedProps} />);
      
      // Should only render visible rows, not all 10,000
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeLessThan(50); // Much less than 10,000
    });
  });

  describe('Error Boundaries', () => {
    it('should handle column rendering errors gracefully', () => {
      const errorColumn = {
        accessorKey: 'error',
        header: 'Error Column',
        cell: () => {
          throw new Error('Cell rendering error');
        }
      };
      
      const errorProps = {
        ...defaultProps,
        columns: [...mockColumns, errorColumn],
        data: [{ ...mockData[0], error: 'test' }]
      };
      
      // Should not crash the entire component
      expect(() => {
        renderWithProviders(<DataTable {...errorProps} />);
      }).not.toThrow();
    });
  });
});
