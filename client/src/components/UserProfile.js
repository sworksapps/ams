import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './UserProfile.css';

// Constants for semantic CSS classes
const STYLES = {
  dropdown: 'user-profile-dropdown',
  userButton: 'user-profile-button',
  avatar: 'user-profile-avatar',
  roleTag: 'user-profile-role-tag',
  logoutButton: 'user-profile-logout-button'
};

const UserProfile = () => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Memoized user data for performance
  const userData = useMemo(() => {
    if (!user) return null;
    
    const displayName = user.name || user.username;
    const initials = user.name 
      ? user.name.charAt(0).toUpperCase() 
      : user.username?.charAt(0).toUpperCase() || 'U';
    
    return {
      displayName,
      initials,
      email: user.email,
      phone: user.phone,
      roles: user.roles || []
    };
  }, [user]);

  // Optimized event handlers
  const handleToggleDropdown = useCallback(() => {
    setIsDropdownOpen(prev => !prev);
  }, []);

  const handleCloseDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    handleCloseDropdown();
    logout();
  }, [logout, handleCloseDropdown]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        handleCloseDropdown();
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen, handleCloseDropdown]);

  if (!userData) return null;

  return (
    <div className="user-profile-container" ref={dropdownRef}>
      <button
        onClick={handleToggleDropdown}
        className={STYLES.userButton}
      >
        <div className={STYLES.avatar}>
          <span className="user-profile-avatar-text">
            {userData.initials}
          </span>
        </div>
        <div className="user-profile-info">
          <p className="user-profile-name">{userData.displayName}</p>
          <p className="user-profile-email">{userData.email}</p>
        </div>
        <ChevronDown className="user-profile-chevron" />
      </button>

      {isDropdownOpen && (
        <div className={STYLES.dropdown}>
          <div className="user-profile-dropdown-content">
            <div className="user-profile-dropdown-header">
              <p className="user-profile-dropdown-name">{userData.displayName}</p>
              <p className="user-profile-dropdown-email">{userData.email}</p>
              {userData.phone && <p className="user-profile-dropdown-phone">{userData.phone}</p>}
            </div>
            
            {userData.roles.length > 0 && (
              <div className="user-profile-roles-section">
                <p className="user-profile-roles-label">Roles:</p>
                <div className="user-profile-roles-container">
                  {userData.roles.map((role, index) => (
                    <span
                      key={index}
                      className={STYLES.roleTag}
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className={STYLES.logoutButton}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
