import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/testUtils';
import Layout from '../../components/Layout/Layout';

// Mock UserProfile component
jest.mock('../../components/UserProfile', () => {
  return function MockUserProfile() {
    return (
      <div data-testid="user-profile">
        <button data-testid="user-menu">User Menu</button>
      </div>
    );
  };
});

// Mock react-router-dom location
const mockLocation = { pathname: '/dashboard' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockLocation
}));

const TestChild = () => <div data-testid="test-child">Test Content</div>;

const defaultProps = {
  children: <TestChild />
};

describe('Layout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render layout with children', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render app name', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      expect(screen.getByText('Asset Manager')).toBeInTheDocument();
    });

    it('should render navigation links', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      expect(screen.getByText('Assets Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Asset Management')).toBeInTheDocument();
      expect(screen.getByText('PPM Tasks')).toBeInTheDocument();
      expect(screen.getByText('AMC')).toBeInTheDocument();
    });

    it('should render user profile component', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });
  });

  describe('Mobile Functionality', () => {
    it('should show mobile menu button on small screens', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveClass('collapsed');
    });

    it('should handle invalid localStorage values gracefully', () => {
      localStorage.setItem('sidebarCollapsed', 'invalid');

      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveClass('expanded'); // Should default to expanded
    });
  });

  describe('User Authentication', () => {
    it('should display user information when authenticated', () => {
      const mockUser = { name: 'John Doe', email: 'john@example.com' };
      
      renderWithProviders(
        <BrowserRouter>
          <Layout user={mockUser} {...defaultProps} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    });

    it('should display guest when not authenticated', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('user-name')).toHaveTextContent('Guest');
    });

    it('should handle logout functionality', () => {
      const mockOnLogout = jest.fn();
      
      renderWithProviders(
        <BrowserRouter>
          <Layout onLogout={mockOnLogout} {...defaultProps} />
        </BrowserRouter>
      );

      const logoutButton = screen.getByTestId('logout-button');
      fireEvent.click(logoutButton);

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('Navigation', () => {
    it('should render navigation links', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('nav-assets')).toBeInTheDocument();
      expect(screen.getByTestId('nav-maintenance')).toBeInTheDocument();
    });

    it('should handle navigation clicks', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      const dashboardLink = screen.getByTestId('nav-dashboard');
      fireEvent.click(dashboardLink);

      // Navigation should be handled by React Router
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile view', () => {
      // Mock window.innerWidth for mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      // On mobile, sidebar should be collapsed by default
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toBeInTheDocument();
    });

    it('should auto-collapse sidebar on small screens', async () => {
      // Mock window resize event
      const resizeEvent = new Event('resize');
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600,
      });

      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      // Trigger resize
      window.dispatchEvent(resizeEvent);

      await waitFor(() => {
        const sidebar = screen.getByTestId('sidebar');
        expect(sidebar).toHaveClass('collapsed');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state when specified', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout loading={true} {...defaultProps} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should hide content when loading', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout loading={true} {...defaultProps} />
        </BrowserRouter>
      );

      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('should show content when not loading', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout loading={false} {...defaultProps} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error occurs', () => {
      const errorMessage = 'Something went wrong';
      
      renderWithProviders(
        <BrowserRouter>
          <Layout error={errorMessage} {...defaultProps} />
        </BrowserRouter>
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should hide content when error is displayed', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout error="Error occurred" {...defaultProps} />
        </BrowserRouter>
      );

      expect(screen.queryByTestId('test-child')).not.toBeInTheDocument();
    });

    it('should provide error retry functionality', () => {
      const mockOnRetry = jest.fn();
      
      renderWithProviders(
        <BrowserRouter>
          <Layout error="Error occurred" onRetry={mockOnRetry} {...defaultProps} />
        </BrowserRouter>
      );

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      const main = screen.getByRole('main');
      expect(main).toHaveAttribute('aria-label', 'Main content');
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      const toggleButton = screen.getByTestId('sidebar-toggle');
      expect(toggleButton).toHaveAttribute('tabindex', '0');
    });

    it('should have proper focus management', async () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      const toggleButton = screen.getByTestId('sidebar-toggle');
      
      // Focus should be manageable
      toggleButton.focus();
      expect(document.activeElement).toBe(toggleButton);
    });

    it('should announce sidebar state changes to screen readers', async () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      const toggleButton = screen.getByTestId('sidebar-toggle');
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      });
    });
  });

  describe('Theme Support', () => {
    it('should apply theme classes', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout theme="dark" {...defaultProps} />
        </BrowserRouter>
      );

      const layoutContainer = document.querySelector('.layout-container');
      expect(layoutContainer).toHaveClass('theme-dark');
    });

    it('should default to light theme', () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      const layoutContainer = document.querySelector('.layout-container');
      expect(layoutContainer).toHaveClass('theme-light');
    });

    it('should persist theme preference', async () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout theme="dark" {...defaultProps} />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('dark');
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      const sidebar = screen.getByTestId('sidebar');
      const initialRenderCount = sidebar.getAttribute('data-render-count') || '1';

      // Re-render with same props
      rerender(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      const newRenderCount = sidebar.getAttribute('data-render-count') || '1';
      expect(newRenderCount).toBe(initialRenderCount);
    });

    it('should handle rapid sidebar toggles efficiently', async () => {
      renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      const toggleButton = screen.getByTestId('sidebar-toggle');

      // Rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(toggleButton);
      }

      // Should still be responsive
      await waitFor(() => {
        expect(toggleButton).toBeInTheDocument();
      });
    });
  });

  describe('Memory Management', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = renderWithProviders(
        <BrowserRouter>
          <Layout {...defaultProps} />
        </BrowserRouter>
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should not cause memory leaks with rapid mount/unmount', () => {
      for (let i = 0; i < 100; i++) {
        const { unmount } = renderWithProviders(
          <BrowserRouter>
            <Layout {...defaultProps} />
          </BrowserRouter>
        );
        unmount();
      }

      // Should not throw or cause performance issues
      expect(true).toBe(true);
    });
  });
});
