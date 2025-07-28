import React from 'react';
import './KPICard.css';

/**
 * Standardized KPI Card Component
 * Used across all pages for consistent KPI display
 */
const KPICard = ({ 
  title, 
  subtitle, 
  data, 
  icon: Icon, 
  color = 'blue', 
  onClick,
  isActive = false,
  loading = false 
}) => {
  // Handle both single value and dual value structure
  const isObjectData = typeof data === 'object' && data !== null;
  const primaryValue = isObjectData ? data.primary : data;
  const secondaryValue = isObjectData ? data.secondary : null;
  
  const cardClasses = [
    'kpi-card',
    `kpi-card-${color}`,
    onClick ? 'kpi-card-clickable' : '',
    isActive ? 'kpi-card-active' : '',
    loading ? 'kpi-card-loading' : ''
  ].filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className={cardClasses}>
        <div className="kpi-card-loading-content">
          <div className="kpi-card-loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className="kpi-card-header">
        <div className="kpi-card-title-section">
          <h3 className="kpi-card-title">{title}</h3>
          {subtitle && <p className="kpi-card-subtitle">{subtitle}</p>}
        </div>
        {Icon && <Icon className="kpi-card-icon" />}
      </div>
      
      <div className="kpi-card-values">
        <div className="kpi-card-primary">{primaryValue}</div>
        {secondaryValue && (
          <div className="kpi-card-secondary">{secondaryValue}</div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
