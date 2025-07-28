import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
} from '@tanstack/react-table';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import './DataTable.css';

const DataTable = ({
  data = [],
  columns = [],
  loading = false,
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  enableGrouping = false,
  enableRowSelection = false,
  enableColumnVisibility = true,
  enableGlobalFilter = true,
  enableExport = false,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onRowSelect,
  onExport,
  className = '',
  emptyMessage = 'No data available',
}) => {
  const [sorting, setSorting] = useState([]);
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [grouping, setGrouping] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: initialPageSize,
  });

  // Memoized table configuration
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      grouping,
      expanded,
      globalFilter,
      pagination,
    },
    enableRowSelection,
    enableGrouping,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    debugTable: false,
  });

  // Handle row selection callback
  React.useEffect(() => {
    if (onRowSelect && Object.keys(rowSelection).length > 0) {
      const selectedRows = table.getSelectedRowModel().rows.map(row => row.original);
      onRowSelect(selectedRows);
    }
  }, [rowSelection, onRowSelect, table]);

  // Export functionality
  const handleExport = () => {
    if (onExport) {
      const visibleRows = table.getRowModel().rows.map(row => row.original);
      onExport(visibleRows);
    }
  };

  if (loading) {
    return (
      <div className={`data-table-loading ${className}`}>
        <div className="data-table-loading-content">
          <div className="data-table-loading-spinner"></div>
          <p className="data-table-loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`data-table ${className}`}>
      {/* Table Controls */}
      <div className="data-table-controls">
        <div className="data-table-controls-container">
          {/* Left side controls */}
          <div className="data-table-left-controls">
            {/* Global Search */}
            {enableGlobalFilter && (
              <div className="data-table-search-container">
                <Search className="data-table-search-icon" />
                <input
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search all columns..."
                  className="data-table-search-input"
                />
              </div>
            )}

            {/* Selected rows indicator */}
            {enableRowSelection && Object.keys(rowSelection).length > 0 && (
              <div className="data-table-selected-indicator">
                {Object.keys(rowSelection).length} row(s) selected
              </div>
            )}
          </div>

          {/* Right side controls */}
          <div className="data-table-right-controls">
            {/* Column Visibility */}
            {enableColumnVisibility && (
              <div className="data-table-column-visibility">
                <button className="data-table-column-button">
                  <Eye className="data-table-column-icon" />
                  Columns
                </button>
                <div className="data-table-dropdown">
                  <div className="data-table-dropdown-content">
                    {table.getAllLeafColumns().map((column) => (
                      <label key={column.id} className="data-table-dropdown-item">
                        <input
                          type="checkbox"
                          checked={column.getIsVisible()}
                          onChange={column.getToggleVisibilityHandler()}
                          className="data-table-dropdown-checkbox"
                        />
                        <span className="data-table-dropdown-label">{column.columnDef.header}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Export */}
            {enableExport && (
              <button
                onClick={handleExport}
                className="data-table-export-button"
              >
                <Download className="data-table-export-icon" />
                Export
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="data-table-container">
        <table className="data-table-table">
          <thead className="data-table-thead">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="data-table-th"
                  >
                    {header.isPlaceholder ? null : (
                      <div className="data-table-th-content">
                        <div
                          className={`data-table-th-text ${
                            header.column.getCanSort() ? 'data-table-th-sortable' : ''
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                        {header.column.getCanSort() && (
                          <div className="data-table-sort-icons">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="data-table-sort-icon" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="data-table-sort-icon" />
                            ) : (
                              <div className="data-table-sort-placeholder">
                                <ChevronUp className="data-table-sort-up" />
                                <ChevronDown className="data-table-sort-down" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="data-table-tbody">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="data-table-empty"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`data-table-tr ${
                    row.getIsSelected() ? 'data-table-tr-selected' : ''
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="data-table-td">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {enablePagination && (
        <div className="data-table-pagination">
          <div className="data-table-pagination-container">
            {/* Page info */}
            <div className="data-table-pagination-info">
              Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{' '}
              of {table.getFilteredRowModel().rows.length} results
            </div>

            {/* Pagination controls */}
            <div className="data-table-pagination-controls">
              {/* Page size selector */}
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="data-table-page-size-select"
              >
                {pageSizeOptions.map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>

              {/* Navigation buttons */}
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="data-table-nav-button"
              >
                <ChevronsLeft className="data-table-nav-icon" />
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="data-table-nav-button"
              >
                <ChevronLeft className="data-table-nav-icon" />
              </button>
              <span className="data-table-page-info">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="data-table-nav-button"
              >
                <ChevronRight className="data-table-nav-icon" />
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="data-table-nav-button"
              >
                <ChevronsRight className="data-table-nav-icon" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
