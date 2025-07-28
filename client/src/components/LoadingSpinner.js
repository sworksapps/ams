import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'Loading...', size = 'medium' }) => {
  const sizeClasses = {
    small: 'loading-spinner-small',
    medium: 'loading-spinner-medium',
    large: 'loading-spinner-large'
  };

  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner-content">
        <div className="loading-spinner-wrapper">
          <div className={`loading-spinner-base ${sizeClasses[size]}`}></div>
        </div>
        <p className="loading-spinner-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
