import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Simple test component
const TestComponent = ({ message = 'Hello World' }) => {
  return <div data-testid="test-message">{message}</div>;
};

describe('Basic Test Infrastructure', () => {
  it('should render a simple component', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('test-message')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should render with custom props', () => {
    render(<TestComponent message="Custom Message" />);
    expect(screen.getByText('Custom Message')).toBeInTheDocument();
  });

  it('should handle basic interactions', () => {
    const mockFn = jest.fn();
    const InteractiveComponent = () => (
      <button onClick={mockFn} data-testid="test-button">
        Click me
      </button>
    );

    render(<InteractiveComponent />);
    const button = screen.getByTestId('test-button');
    
    expect(button).toBeInTheDocument();
    button.click();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should verify Jest and React Testing Library are working', () => {
    expect(true).toBe(true);
    expect('test').toEqual('test');
    expect([1, 2, 3]).toHaveLength(3);
  });
});
