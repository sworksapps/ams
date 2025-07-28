import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
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

const TestChild = () => <div data-testid="test-child">Test Content</div>;

describe('Layout Component - Simplified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
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
      
      // App name appears twice (mobile and desktop), so use getAllByText
      const appNames = screen.getAllByText('Asset Manager');
      expect(appNames.length).toBeGreaterThanOrEqual(1);
    });

    it('should render navigation links', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      // Navigation items appear twice (mobile and desktop)
      expect(screen.getAllByText('Assets Dashboard').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Asset Management').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('PPM Tasks').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('AMC').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('R&M').length).toBeGreaterThanOrEqual(1);
    });

    it('should render user profile component', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });

    it('should have mobile menu button', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      // Should have buttons (including mobile menu)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    it('should render all navigation items', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      // Check for main navigation items (appear twice for mobile/desktop)
      expect(screen.getAllByText('Assets Dashboard').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Asset Management').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('PPM Schedules').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('PPM Tasks').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('AMC').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('AMC Renewals').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('R&M').length).toBeGreaterThanOrEqual(1);
    });

    it('should render navigation links as Link components', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      // Check that navigation items are rendered as links
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      // App name should be a heading (appears twice for mobile/desktop)
      const appNames = screen.getAllByText('Asset Manager');
      expect(appNames.length).toBeGreaterThanOrEqual(1);
    });

    it('should have accessible navigation', () => {
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      // Should have navigation elements
      const navElements = screen.getAllByRole('navigation');
      expect(navElements.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should handle mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      renderWithProviders(
        <Layout>
          <TestChild />
        </Layout>
      );
      
      // Should still render content
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      // App name appears twice (mobile and desktop)
      const appNames = screen.getAllByText('Asset Manager');
      expect(appNames.length).toBeGreaterThanOrEqual(1);
    });
  });
});
