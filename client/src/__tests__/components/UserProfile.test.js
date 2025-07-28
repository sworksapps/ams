import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockApiResponses } from '../utils/testUtils';
import UserProfile from '../../components/UserProfile';
import * as api from '../../utils/api';

// Mock the API module
jest.mock('../../utils/api');
const mockAPI = api;

// Mock Keycloak
const mockKeycloak = {
  authenticated: true,
  token: 'mock-token',
  tokenParsed: {
    sub: 'user-123',
    preferred_username: 'john.doe',
    given_name: 'John',
    family_name: 'Doe',
    email: 'john.doe@company.com',
    roles: ['user', 'admin']
  },
  logout: jest.fn(),
  updateToken: jest.fn().mockResolvedValue(true),
  accountManagement: jest.fn()
};

jest.mock('../../utils/keycloak', () => ({
  getKeycloak: () => mockKeycloak
}));

const mockUserProfile = {
  id: 'user-123',
  username: 'john.doe',
  email: 'john.doe@company.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+91-9876543210',
  department: 'IT',
  designation: 'Senior Engineer',
  location: 'Mumbai - Andheri',
  avatar: 'uploads/avatars/john_doe.jpg',
  preferences: {
    theme: 'light',
    language: 'en',
    notifications: {
      email: true,
      push: false,
      sms: true
    }
  },
  lastLogin: '2024-01-15T10:00:00Z',
  createdAt: '2023-06-01T00:00:00Z'
};

const mockActivityLog = [
  {
    id: 1,
    action: 'login',
    description: 'User logged in',
    timestamp: '2024-01-15T10:00:00Z',
    ipAddress: '192.168.1.100'
  },
  {
    id: 2,
    action: 'profile_update',
    description: 'Updated profile information',
    timestamp: '2024-01-15T09:30:00Z',
    ipAddress: '192.168.1.100'
  }
];

describe('UserProfile Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAPI.userAPI = {
      getProfile: jest.fn().mockResolvedValue(mockUserProfile),
      updateProfile: jest.fn().mockResolvedValue({ message: 'Profile updated successfully' }),
      updatePreferences: jest.fn().mockResolvedValue({ message: 'Preferences updated successfully' }),
      uploadAvatar: jest.fn().mockResolvedValue({ 
        avatar: 'uploads/avatars/new_avatar.jpg',
        message: 'Avatar updated successfully'
      }),
      getActivityLog: jest.fn().mockResolvedValue(mockActivityLog),
      changePassword: jest.fn().mockResolvedValue({ message: 'Password changed successfully' }),
      deleteAccount: jest.fn().mockResolvedValue({ message: 'Account deleted successfully' })
    };
  });

  describe('Rendering', () => {
    it('should render user profile page', async () => {
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByText('User Profile')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
      });
    });

    it('should render profile tabs', async () => {
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Preferences')).toBeInTheDocument();
        expect(screen.getByText('Security')).toBeInTheDocument();
        expect(screen.getByText('Activity')).toBeInTheDocument();
      });
    });

    it('should render user information fields', async () => {
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
        expect(screen.getByDisplayValue('john.doe@company.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('+91-9876543210')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should show loading state initially', () => {
      mockAPI.userAPI.getProfile.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<UserProfile />);
      
      expect(screen.getByText('Loading profile...')).toBeInTheDocument();
    });

    it('should load user profile on mount', async () => {
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(mockAPI.userAPI.getProfile).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle API errors gracefully', async () => {
      mockAPI.userAPI.getProfile.mockRejectedValue(new Error('Failed to load profile'));
      
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByText('Error loading profile')).toBeInTheDocument();
      });
    });
  });

  describe('Profile Information Update', () => {
    it('should update profile information', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });

      const firstNameInput = screen.getByDisplayValue('John');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Johnny');

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockAPI.userAPI.updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ firstName: 'Johnny' })
        );
      });
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });

      const firstNameInput = screen.getByDisplayValue('John');
      await user.clear(firstNameInput);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('john.doe@company.com')).toBeInTheDocument();
      });

      const emailInput = screen.getByDisplayValue('john.doe@company.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid-email');

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      });
    });

    it('should handle profile update errors', async () => {
      mockAPI.userAPI.updateProfile.mockRejectedValue(new Error('Update failed'));
      
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument();
      });

      const firstNameInput = screen.getByDisplayValue('John');
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Johnny');

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update profile')).toBeInTheDocument();
      });
    });
  });

  describe('Avatar Management', () => {
    it('should upload new avatar', async () => {
      const file = new File(['avatar content'], 'avatar.jpg', { type: 'image/jpeg' });
      
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('Upload avatar')).toBeInTheDocument();
      });

      const fileInput = screen.getByLabelText('Upload avatar');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(mockAPI.userAPI.uploadAvatar).toHaveBeenCalledWith(expect.any(FormData));
      });
    });

    it('should validate avatar file type', async () => {
      const invalidFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });
      
      renderWithProviders(<UserProfile />);
      
      const fileInput = screen.getByLabelText('Upload avatar');
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText('Please select a valid image file')).toBeInTheDocument();
      });
    });

    it('should validate avatar file size', async () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { 
        type: 'image/jpeg' 
      });
      
      renderWithProviders(<UserProfile />);
      
      const fileInput = screen.getByLabelText('Upload avatar');
      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(screen.getByText('Avatar file size must be less than 5MB')).toBeInTheDocument();
      });
    });
  });

  describe('Preferences Management', () => {
    it('should display preferences tab', async () => {
      renderWithProviders(<UserProfile />);
      
      fireEvent.click(screen.getByText('Preferences'));
      
      await waitFor(() => {
        expect(screen.getByText('Theme')).toBeInTheDocument();
        expect(screen.getByText('Language')).toBeInTheDocument();
        expect(screen.getByText('Notifications')).toBeInTheDocument();
      });
    });

    it('should update theme preference', async () => {
      renderWithProviders(<UserProfile />);
      
      fireEvent.click(screen.getByText('Preferences'));
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('light')).toBeInTheDocument();
      });

      const themeSelect = screen.getByDisplayValue('light');
      fireEvent.change(themeSelect, { target: { value: 'dark' } });

      const saveButton = screen.getByText('Save Preferences');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockAPI.userAPI.updatePreferences).toHaveBeenCalledWith(
          expect.objectContaining({ theme: 'dark' })
        );
      });
    });

    it('should update notification preferences', async () => {
      renderWithProviders(<UserProfile />);
      
      fireEvent.click(screen.getByText('Preferences'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Email notifications')).toBeInTheDocument();
      });

      const emailCheckbox = screen.getByLabelText('Email notifications');
      fireEvent.click(emailCheckbox);

      const saveButton = screen.getByText('Save Preferences');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockAPI.userAPI.updatePreferences).toHaveBeenCalledWith(
          expect.objectContaining({ 
            notifications: expect.objectContaining({ email: false })
          })
        );
      });
    });
  });

  describe('Security Management', () => {
    it('should display security tab', async () => {
      renderWithProviders(<UserProfile />);
      
      fireEvent.click(screen.getByText('Security'));
      
      await waitFor(() => {
        expect(screen.getByText('Change Password')).toBeInTheDocument();
        expect(screen.getByText('Account Management')).toBeInTheDocument();
      });
    });

    it('should change password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);
      
      fireEvent.click(screen.getByText('Security'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
      });

      const currentPasswordInput = screen.getByLabelText('Current Password');
      const newPasswordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

      await user.type(currentPasswordInput, 'currentpass123');
      await user.type(newPasswordInput, 'newpass123');
      await user.type(confirmPasswordInput, 'newpass123');

      const changePasswordButton = screen.getByText('Change Password');
      fireEvent.click(changePasswordButton);

      await waitFor(() => {
        expect(mockAPI.userAPI.changePassword).toHaveBeenCalledWith({
          currentPassword: 'currentpass123',
          newPassword: 'newpass123'
        });
      });
    });

    it('should validate password confirmation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<UserProfile />);
      
      fireEvent.click(screen.getByText('Security'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      });

      const newPasswordInput = screen.getByLabelText('New Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm New Password');

      await user.type(newPasswordInput, 'newpass123');
      await user.type(confirmPasswordInput, 'differentpass');

      const changePasswordButton = screen.getByText('Change Password');
      fireEvent.click(changePasswordButton);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
    });
  });

  describe('Activity Log', () => {
    it('should display activity log', async () => {
      renderWithProviders(<UserProfile />);
      
      fireEvent.click(screen.getByText('Activity'));
      
      await waitFor(() => {
        expect(mockAPI.userAPI.getActivityLog).toHaveBeenCalled();
        expect(screen.getByText('User logged in')).toBeInTheDocument();
        expect(screen.getByText('Updated profile information')).toBeInTheDocument();
      });
    });

    it('should handle empty activity log', async () => {
      mockAPI.userAPI.getActivityLog.mockResolvedValue([]);
      
      renderWithProviders(<UserProfile />);
      
      fireEvent.click(screen.getByText('Activity'));
      
      await waitFor(() => {
        expect(screen.getByText('No activity recorded')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByLabelText('First Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Email')).toBeInTheDocument();
        expect(screen.getByLabelText('Phone')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByText('Preferences')).toBeInTheDocument();
      });

      const preferencesTab = screen.getByText('Preferences');
      fireEvent.keyDown(preferencesTab, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByText('Theme')).toBeInTheDocument();
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
      
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        expect(screen.getByText('User Profile')).toBeInTheDocument();
      });
    });

    it('should stack form fields on small screens', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640
      });
      
      renderWithProviders(<UserProfile />);
      
      await waitFor(() => {
        const formGrid = screen.getByTestId('profile-form-grid');
        expect(formGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2');
      });
    });
  });
});
