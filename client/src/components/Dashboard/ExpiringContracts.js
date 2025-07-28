import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const ExpiringContracts = ({ contracts }) => {
  if (!contracts || contracts.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
          Expiring Contracts
        </h3>
        <p className="text-gray-500 text-sm">No contracts expiring soon</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-600" />
          Expiring Contracts
        </h3>
        <Link 
          to="/coverage?expiring=30" 
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          View All
        </Link>
      </div>
      
      <div className="space-y-3">
        {contracts.slice(0, 5).map((contract) => (
          <div key={contract.id || `${contract.equipment_name}-${contract.vendor_name}`} 
               className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {contract.equipment_name}
              </p>
              <p className="text-xs text-gray-500">
                {contract.vendor_name} • {contract.coverage_type}
              </p>
              <p className="text-xs text-gray-500">
                {contract.location}
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                contract.days_left <= 7 
                  ? 'bg-red-100 text-red-800'
                  : contract.days_left <= 30
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {contract.days_left} days
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {contract.period_till ? format(new Date(contract.period_till), 'MMM dd') : 'N/A'}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {contracts.length > 5 && (
        <div className="mt-4 text-center">
          <Link 
            to="/coverage?expiring=30" 
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View {contracts.length - 5} more contracts →
          </Link>
        </div>
      )}
    </div>
  );
};

export default ExpiringContracts;
