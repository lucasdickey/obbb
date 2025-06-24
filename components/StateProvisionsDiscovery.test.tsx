import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StateProvisionsDiscovery from './StateProvisionsDiscovery';

// Mock fetch
global.fetch = jest.fn();

describe('StateProvisionsDiscovery', () => {
  const mockOnStartChat = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    render(<StateProvisionsDiscovery onStartChat={mockOnStartChat} />);
    
    expect(screen.getByText('Discover State-Specific Provisions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select a state...')).toBeInTheDocument();
    expect(screen.getByText('Discover State Provisions')).toBeInTheDocument();
  });

  it('displays all state options in dropdown', () => {
    render(<StateProvisionsDiscovery onStartChat={mockOnStartChat} />);
    
    const select = screen.getByPlaceholderText('Select a state...');
    
    // Check that some states are present
    expect(select).toHaveTextContent('California');
    expect(select).toHaveTextContent('Texas');
    expect(select).toHaveTextContent('New York');
  });

  it('enables button when state is selected', () => {
    render(<StateProvisionsDiscovery onStartChat={mockOnStartChat} />);
    
    const select = screen.getByPlaceholderText('Select a state...');
    const button = screen.getByText('Discover State Provisions');
    
    expect(button).toBeDisabled();
    
    fireEvent.change(select, { target: { value: 'CA' } });
    
    expect(button).not.toBeDisabled();
  });

  it('makes API call when button is clicked', async () => {
    const mockResponse = {
      state: 'California',
      stateCode: 'CA',
      provisionTypes: {
        funding: { count: 5, estimatedAmount: '$1.5B' },
        regulatory: { count: 3 },
        infrastructure: { count: 2 }
      },
      keyProvisions: [
        {
          title: 'Transportation Funding',
          description: 'Funding for California transportation projects',
          section: 'Division A, Title II',
          estimatedAmount: '$500M',
          chunkIndex: 1
        }
      ],
      totalProvisions: 10,
      processingTime: 1234
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<StateProvisionsDiscovery onStartChat={mockOnStartChat} />);
    
    const select = screen.getByPlaceholderText('Select a state...');
    const button = screen.getByText('Discover State Provisions');
    
    fireEvent.change(select, { target: { value: 'CA' } });
    fireEvent.click(button);
    
    expect(button).toHaveTextContent('Analyzing...');
    expect(button).toBeDisabled();
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/state-provisions/CA');
    });
    
    await waitFor(() => {
      expect(screen.getByText('California State Provisions')).toBeInTheDocument();
      expect(screen.getByText('10 provisions found')).toBeInTheDocument();
      expect(screen.getByText('Transportation Funding')).toBeInTheDocument();
    });
  });

  it('displays error message when API call fails', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    render(<StateProvisionsDiscovery onStartChat={mockOnStartChat} />);
    
    const select = screen.getByPlaceholderText('Select a state...');
    const button = screen.getByText('Discover State Provisions');
    
    fireEvent.change(select, { target: { value: 'CA' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch state provisions/)).toBeInTheDocument();
    });
  });

  it('allows user to analyze a different state after results', async () => {
    const mockResponse = {
      state: 'California',
      stateCode: 'CA',
      provisionTypes: { funding: { count: 1 } },
      keyProvisions: [],
      totalProvisions: 1,
      processingTime: 1234
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<StateProvisionsDiscovery onStartChat={mockOnStartChat} />);
    
    const select = screen.getByPlaceholderText('Select a state...');
    const button = screen.getByText('Discover State Provisions');
    
    fireEvent.change(select, { target: { value: 'CA' } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('California State Provisions')).toBeInTheDocument();
    });
    
    // Click "Analyze Another State" button
    const analyzeAnotherButton = screen.getByText('Analyze Another State');
    fireEvent.click(analyzeAnotherButton);
    
    // Should reset to initial state
    expect(screen.queryByText('California State Provisions')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select a state...')).toBeInTheDocument();
  });
});