import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Wrench, 
  Filter, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle,
  BarChart3,
  Activity,
  AlertCircle,
  Zap,
  ClipboardList,
  Users,
  Timer,
  ExternalLink,
  Plus
} from 'lucide-react';
import { ticketsAPI } from '../utils/api';
import { useScrollManagement } from '../hooks/useScrollManagement';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import DataTable from '../components/DataTable/DataTable';
import RepairRequestForm from '../components/RepairRequest/RepairRequestForm';
import { format } from 'date-fns';
import './TicketManagement.css';

const TicketManagement = () => {
  useScrollManagement('ticket-management');
  
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    status: '',
    view: 'open' // Default to open tickets
  });
  const [kpis, setKpis] = useState({
    totalTickets: 0,
    openTickets: 0,
    criticalTickets: 0,
    pastDueTickets: 0,
    closedTickets: 0
  });
  const [kpisLoading, setKpisLoading] = useState(true);
  const [statusOptions, setStatusOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);
  const [showRepairRequestForm, setShowRepairRequestForm] = useState(false);
  const { scrollContainerRef } = useScrollManagement('ticket-management');

  // TanStack Table column definitions
  const columns = useMemo(
    () => [
      {
        accessorKey: 'locationShortCode',
        header: 'Location',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="ticket-management-cell-text">
              {value != null ? String(value) : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          const displayValue = value != null ? String(value) : 'N/A';
          return (
            <div className="ticket-management-cell-text-truncate" title={displayValue}>
              {displayValue}
            </div>
          );
        },
      },
      {
        accessorKey: 'pendingWith',
        header: 'Pending With',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          const displayValue = value != null ? String(value) : 'N/A';
          return (
            <div className="ticket-management-cell-text-truncate" title={displayValue}>
              {displayValue}
            </div>
          );
        },
      },
      {
        accessorKey: 'ticketNumber',
        header: 'Ticket ID',
        enableSorting: true,
        cell: ({ getValue }) => {
          const value = getValue();
          return (
            <div className="ticket-management-cell-text-medium">
              {value != null ? String(value) : 'N/A'}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        enableSorting: true,
        cell: ({ getValue, row }) => {
          const status = getValue();
          const statusValue = status != null ? String(status) : 'N/A';
          const StatusIcon = getStatusIcon(statusValue);
          return (
            <div className="ticket-management-status-container">
              <StatusIcon className="ticket-management-status-icon" />
              <span className={`ticket-management-status-badge ${getStatusColor(statusValue)}`}>
                {statusValue}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'External',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="ticket-management-external-container">
            <a
              href={`https://uat-sw-ticketing-api.sworks.co.in/ticket/${row.original.ticketNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ticket-management-external-link"
              title="Open in external system"
            >
              <ExternalLink className="ticket-management-external-icon" />
            </a>
          </div>
        ),
      },
    ],
    []
  );

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      console.log('🔄 Fetching R&M initial data...');
      const [kpisRes, statusRes, locationRes] = await Promise.all([
        ticketsAPI.getRMKpis().catch(err => {
          console.error('KPIs API failed:', err);
          return { data: null };
        }),
        ticketsAPI.getRMStatusOptions().catch(err => {
          console.error('Status options API failed:', err);
          return { data: [] };
        }),
        ticketsAPI.getRMLocationOptions().catch(err => {
          console.error('Location options API failed:', err);
          return { data: [] };
        })
      ]);
      
      // Set KPIs with fallback
      setKpis(kpisRes?.data || {
        totalTickets: 0,
        openTickets: 0,
        criticalTickets: 0,
        pastDueTickets: 0,
        closedTickets: 0
      });
      
      // Ensure arrays are always set, even if API returns unexpected data
      const statusData = statusRes?.data;
      const locationData = locationRes?.data;
      
      console.log('📊 Status data received:', statusData);
      console.log('📍 Location data received:', locationData);
      
      setStatusOptions(Array.isArray(statusData) ? statusData : []);
      setLocationOptions(Array.isArray(locationData) ? locationData : []);
      
      console.log('✅ R&M initial data loaded successfully');
    } catch (error) {
      console.error('❌ Error fetching R&M initial data:', error);
      // Set fallback values on error
      setKpis({
        totalTickets: 0,
        openTickets: 0,
        criticalTickets: 0,
        pastDueTickets: 0,
        closedTickets: 0
      });
      setStatusOptions([]);
      setLocationOptions([]);
    } finally {
      setKpisLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketsAPI.getRMExternalTickets(filters);
      setTickets(response.data);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setKpisLoading(true);
    await Promise.all([fetchInitialData(), fetchTickets()]);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleKpiFilter = (view) => {
    setFilters(prev => ({ ...prev, view }));
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      status: '',
      search: '',
      view: 'open'
    });
  };

  const getActiveFilterCount = () => {
    return Object.entries(filters).filter(([key, value]) => 
      key !== 'view' && value && value.trim() !== ''
    ).length;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'in progress':
        return 'ticket-management-status-open';
      case 'closed':
      case 'resolved':
        return 'ticket-management-status-closed';
      case 'pending':
        return 'ticket-management-status-pending';
      case 'critical':
        return 'ticket-management-status-critical';
      default:
        return 'ticket-management-status-default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return Clock;
      case 'in_progress': return Wrench;
      case 'completed': return CheckCircle;
      case 'closed': return CheckCircle;
      case 'overdue': return AlertTriangle;
      default: return Clock;
    }
  };

  return (
    <div className="ticket-management-container" ref={scrollContainerRef}>
      <div className="ticket-management-header">
        <div className="ticket-management-title-section">
          <h1 className="ticket-management-title">Repairs</h1>
          <p className="ticket-management-subtitle">Manage repair and maintenance requests</p>
        </div>
        <div className="ticket-management-controls">
          <button
            onClick={() => setShowRepairRequestForm(true)}
            className="ticket-management-create-btn"
          >
            <Plus size={16} />
            Create Repair Request
          </button>
          <button
            onClick={refreshData}
            className="ticket-management-refresh-btn"
            title="Refresh data"
          >
            <RefreshCw className="ticket-management-refresh-icon" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {kpisLoading ? (
        <div className="ticket-management-kpi-grid">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="ticket-management-kpi-loading">
              <div className="ticket-management-kpi-loading-content">
                <div className="ticket-management-kpi-loading-icon"></div>
                <div className="ticket-management-kpi-loading-text">
                  <div className="ticket-management-kpi-loading-title"></div>
                  <div className="ticket-management-kpi-loading-value"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ticket-management-kpi-grid">
          <button
            onClick={() => handleKpiFilter('all')}
            className={`ticket-management-kpi-card ${
              filters.view === 'all' ? 'ticket-management-kpi-card-active' : ''
            }`}
          >
            <div className="ticket-management-kpi-content">
              <ClipboardList className="ticket-management-kpi-icon ticket-management-kpi-icon-blue" />
              <div className="ticket-management-kpi-text">
                <p className="ticket-management-kpi-label">Total Repairs</p>
                <p className="ticket-management-kpi-value">{kpis.totalTickets}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => handleKpiFilter('open')}
            className={`ticket-management-kpi-card ${
              filters.view === 'open' ? 'ticket-management-kpi-card-active' : ''
            }`}
          >
            <div className="ticket-management-kpi-content">
              <Activity className="ticket-management-kpi-icon ticket-management-kpi-icon-green" />
              <div className="ticket-management-kpi-text">
                <p className="ticket-management-kpi-label">Open Repairs</p>
                <p className="ticket-management-kpi-value">{kpis.openTickets}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => handleKpiFilter('critical')}
            className={`ticket-management-kpi-card ${
              filters.view === 'critical' ? 'ticket-management-kpi-card-active' : ''
            }`}
          >
            <div className="ticket-management-kpi-content">
              <Zap className="ticket-management-kpi-icon ticket-management-kpi-icon-orange" />
              <div className="ticket-management-kpi-text">
                <p className="ticket-management-kpi-label">Critical</p>
                <p className="ticket-management-kpi-value">{kpis.criticalTickets}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => handleKpiFilter('overdue')}
            className={`ticket-management-kpi-card ${
              filters.view === 'overdue' ? 'ticket-management-kpi-card-active' : ''
            }`}
          >
            <div className="ticket-management-kpi-content">
              <AlertTriangle className="ticket-management-kpi-icon ticket-management-kpi-icon-red" />
              <div className="ticket-management-kpi-text">
                <p className="ticket-management-kpi-label">Past Due</p>
                <p className="ticket-management-kpi-value">{kpis.pastDueTickets}</p>
              </div>
            </div>
          </button>
          
          <button
            onClick={() => handleKpiFilter('closed')}
            className={`ticket-management-kpi-card ${
              filters.view === 'closed' ? 'ticket-management-kpi-card-active' : ''
            }`}
          >
            <div className="ticket-management-kpi-content">
              <CheckCircle className="ticket-management-kpi-icon ticket-management-kpi-icon-gray" />
              <div className="ticket-management-kpi-text">
                <p className="ticket-management-kpi-label">Closed</p>
                <p className="ticket-management-kpi-value">{kpis.closedTickets}</p>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="ticket-management-filters">
        <div className="ticket-management-filters-header">
          <h3 className="ticket-management-filters-title">
            <Filter className="ticket-management-filters-icon" />
            Filters
            {getActiveFilterCount() > 0 && (
              <span className="ticket-management-filters-badge">
                {getActiveFilterCount()} active
              </span>
            )}
          </h3>
          <button
            onClick={clearFilters}
            className="ticket-management-filters-clear"
          >
            Clear All
          </button>
        </div>
        
        <div className="ticket-management-filters-grid">
          <div className="ticket-management-filter-group">
            <label className="ticket-management-filter-label">
              Search
            </label>
            <input
              type="text"
              className="input"
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <div className="ticket-management-filter-group">
            <label className="ticket-management-filter-label">
              Location
            </label>
            <select
              className="select"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            >
              <option value="">All Locations</option>
              {Array.isArray(locationOptions) && locationOptions.map(location => (
                <option key={location.value || location} value={location.value || location}>
                  {location.label || location}
                </option>
              ))}
            </select>
          </div>
          
          <div className="ticket-management-filter-group">
            <label className="ticket-management-filter-label">
              Status
            </label>
            <select
              className="select"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              {Array.isArray(statusOptions) && statusOptions.map(status => (
                <option key={status.value || status} value={status.value || status}>
                  {status.label || status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Repairs Table */}
      <div className="ticket-management-table-container">
        <div className="ticket-management-table-header">
          <h3 className="ticket-management-table-title">
            Repairs ({tickets.length})
          </h3>
        </div>
        
        <DataTable
          data={tickets}
          columns={columns}
          loading={loading}
          emptyState={{
            icon: Wrench,
            title: "No repairs found",
            description: "No repair requests match your current filters."
          }}
        />
      </div>

      {/* Repair Request Form Modal */}
      {showRepairRequestForm && (
        <RepairRequestForm
          onClose={() => setShowRepairRequestForm(false)}
        />
      )}
    </div>
  );
};



export default TicketManagement;
