import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Calendar, User, AlertTriangle, CheckCircle, Clock, Ticket } from 'lucide-react';
import { ticketsAPI } from '../utils/api';
import { useScrollManagement } from '../hooks/useScrollManagement';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { format } from 'date-fns';

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const { scrollContainerRef } = useScrollManagement('ticket-details');

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await ticketsAPI.getById(id);
      setTicket(response.data);
    } catch (err) {
      setError('Failed to fetch ticket details');
      console.error('Ticket details error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (assignData) => {
    try {
      await ticketsAPI.assign(id, assignData);
      fetchTicketDetails();
      setShowAssignModal(false);
      alert('Ticket assigned successfully!');
    } catch (error) {
      console.error('Error assigning ticket:', error);
      alert('Error assigning ticket. Please try again.');
    }
  };

  const handleClose = async (closeData) => {
    try {
      await ticketsAPI.close(id, closeData);
      fetchTicketDetails();
      setShowCloseModal(false);
      alert('Ticket closed successfully!');
    } catch (error) {
      console.error('Error closing ticket:', error);
      alert('Error closing ticket. Please try again.');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-green-100 text-green-800';
      case 'violated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return Ticket;
      case 'in_progress': return Clock;
      case 'closed': return CheckCircle;
      case 'violated': return AlertTriangle;
      default: return Ticket;
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-600 py-8">{error}</div>;
  if (!ticket) return <div className="text-center text-gray-600 py-8">Ticket not found</div>;

  const StatusIcon = getStatusIcon(ticket.status);
  const isViolated = ticket.sla_due_date && new Date(ticket.sla_due_date) < new Date() && ticket.status !== 'closed';

  return (
    <div ref={scrollContainerRef} className="space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/tickets')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back to Repairs
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.title}</h1>
            <p className="text-gray-600">Ticket ID: {ticket.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {ticket.status !== 'closed' && (
            <>
              <button
                onClick={() => setShowAssignModal(true)}
                className="btn btn-secondary"
              >
                <User className="h-4 w-4 mr-2" />
                {ticket.assigned_to ? 'Reassign' : 'Assign'}
              </button>
              <button
                onClick={() => setShowCloseModal(true)}
                className="btn btn-success"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Close Ticket
              </button>
            </>
          )}
          <button className="btn btn-primary">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center">
            <StatusIcon className={`h-8 w-8 mr-3 ${isViolated ? 'text-red-600' : 'text-blue-600'}`} />
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Priority</p>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority}
              </span>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <User className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Assigned To</p>
              <p className="text-lg font-semibold text-gray-900">{ticket.assigned_to || 'Unassigned'}</p>
            </div>
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Created</p>
              <p className="text-lg font-semibold text-gray-900">
                {ticket.created_at ? format(new Date(ticket.created_at), 'MMM dd') : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SLA Warning */}
      {isViolated && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">SLA Violation</h3>
              <p className="text-sm text-red-700">
                This ticket has exceeded its SLA deadline of {format(new Date(ticket.sla_due_date), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {/* Asset Information */}
          {ticket.equipment_name && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Asset</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Asset Name</label>
                  <p className="mt-1 text-sm text-gray-900">{ticket.equipment_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="mt-1 text-sm text-gray-900">{ticket.asset_category_name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
              <div className="space-y-2">
                {ticket.attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{attachment.originalName}</p>
                      <p className="text-xs text-gray-500">{attachment.size} bytes</p>
                    </div>
                    <button className="text-primary-600 hover:text-primary-700 text-sm">
                      Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Information */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <p className="mt-1 text-sm text-gray-900">{ticket.location}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset Category</label>
                <p className="mt-1 text-sm text-gray-900">{ticket.asset_category || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Asset Subcategory</label>
                <p className="mt-1 text-sm text-gray-900">{ticket.asset_subcategory || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vendor</label>
                <p className="mt-1 text-sm text-gray-900">{ticket.vendor || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nature</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{ticket.nature}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Chargeable To</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{ticket.chargeable_to}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created By</label>
                <p className="mt-1 text-sm text-gray-900">{ticket.created_by}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Ticket className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Ticket Created</p>
                  <p className="text-sm text-gray-500">
                    {ticket.created_at ? format(new Date(ticket.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                  </p>
                </div>
              </div>

              {ticket.assigned_to && (
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-yellow-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Assigned to {ticket.assigned_to}</p>
                    <p className="text-sm text-gray-500">
                      {ticket.updated_at ? format(new Date(ticket.updated_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                    </p>
                  </div>
                </div>
              )}

              {ticket.status === 'closed' && ticket.closed_at && (
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Ticket Closed</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(ticket.closed_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SLA Information */}
          {ticket.sla_due_date && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">SLA Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {format(new Date(ticket.sla_due_date), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className={`mt-1 text-sm font-medium ${
                    isViolated ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {isViolated ? 'Violated' : 'Within SLA'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <AssignModal
          currentAssignee={ticket.assigned_to}
          onAssign={handleAssign}
          onClose={() => setShowAssignModal(false)}
        />
      )}

      {/* Close Modal */}
      {showCloseModal && (
        <CloseModal
          onClose={handleClose}
          onCancel={() => setShowCloseModal(false)}
        />
      )}
    </div>
  );
};

// Assign Modal Component
const AssignModal = ({ currentAssignee, onAssign, onClose }) => {
  const [assignee, setAssignee] = useState(currentAssignee || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!assignee.trim()) {
      alert('Please enter an assignee name');
      return;
    }
    onAssign({ assigned_to: assignee });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {currentAssignee ? 'Reassign Ticket' : 'Assign Ticket'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign To
              </label>
              <input
                type="text"
                className="input"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Enter assignee name"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                {currentAssignee ? 'Reassign' : 'Assign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Close Modal Component
const CloseModal = ({ onClose, onCancel }) => {
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose({ resolution_notes: resolutionNotes });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Close Ticket
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Notes
              </label>
              <textarea
                className="input"
                rows="4"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Enter resolution details (optional)"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success"
              >
                Close Ticket
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;
