import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryClient, QueryClientProvider } from 'react-query';
import SnippetModal from '../SnippetModal';
import api from '../../services/api';

// Mock monaco-editor
vi.mock('@monaco-editor/react', () => ({
  default: (props) => {
    if (props.onChange) {
      // Add an event listener to allow simulating changes
      setTimeout(() => props.onChange('SinOsc => dac;'), 0);
    }
    return <div data-testid="monaco-editor">Monaco Editor</div>;
  }
}));

// Mock the API
vi.mock('../../services/api', () => ({
  default: {
    createSnippet: vi.fn(),
    updateSnippet: vi.fn(),
  },
}));

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('SnippetModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  test('renders create snippet form correctly', () => {
    const onClose = vi.fn();
    
    render(<SnippetModal onClose={onClose} />, {
      wrapper: createWrapper(),
    });
    
    // Check for form elements
    expect(screen.getByText('Create Snippet')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Add a tag/)).toBeInTheDocument();
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    
    // Check for buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save Snippet')).toBeInTheDocument();
  });
  
  test('renders edit snippet form with snippet data', () => {
    const onClose = vi.fn();
    const snippet = {
      id: 1,
      name: 'Test Snippet',
      code: 'SinOsc => dac;',
      description: 'A test snippet',
      tags: ['test', 'sine'],
    };
    
    render(<SnippetModal snippet={snippet} onClose={onClose} />, {
      wrapper: createWrapper(),
    });
    
    // Check for form elements with populated data
    expect(screen.getByText('Edit Snippet')).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/).value).toBe('Test Snippet');
    expect(screen.getByLabelText(/Description/).value).toBe('A test snippet');
    
    // Check for tags
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('sine')).toBeInTheDocument();
  });
  
  test('handles form submission for creation', async () => {
    const onClose = vi.fn();
    api.createSnippet.mockResolvedValue({ id: 1, name: 'New Snippet' });
    
    render(<SnippetModal onClose={onClose} />, {
      wrapper: createWrapper(),
    });
    
    // Fill the form
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: 'New Snippet' },
    });
    
    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'A new test snippet' },
    });
    
    // Add a tag
    fireEvent.change(screen.getByPlaceholderText(/Add a tag/), {
      target: { value: 'test-tag' },
    });
    fireEvent.click(screen.getByText('Add'));
    
    // Submit the form
    fireEvent.click(screen.getByText('Save Snippet'));
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(api.createSnippet).toHaveBeenCalledWith({
        name: 'New Snippet',
        description: 'A new test snippet',
        code: 'SinOsc => dac;',
        tags: ['test-tag'],
      });
      expect(onClose).toHaveBeenCalledWith(true);
    });
  });
  
  test('handles form submission for update', async () => {
    const onClose = vi.fn();
    const snippet = {
      id: 1,
      name: 'Test Snippet',
      code: 'SinOsc => dac;',
      description: 'A test snippet',
      tags: ['test'],
    };
    
    api.updateSnippet.mockResolvedValue({ id: 1, name: 'Updated Snippet' });
    
    render(<SnippetModal snippet={snippet} onClose={onClose} />, {
      wrapper: createWrapper(),
    });
    
    // Update the form
    fireEvent.change(screen.getByLabelText(/Name/), {
      target: { value: 'Updated Snippet' },
    });
    
    // Add a new tag
    fireEvent.change(screen.getByPlaceholderText(/Add a tag/), {
      target: { value: 'updated' },
    });
    fireEvent.click(screen.getByText('Add'));
    
    // Submit the form
    fireEvent.click(screen.getByText('Save Snippet'));
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(api.updateSnippet).toHaveBeenCalledWith(1, {
        name: 'Updated Snippet',
        description: 'A test snippet',
        code: 'SinOsc => dac;',
        tags: ['test', 'updated'],
      });
      expect(onClose).toHaveBeenCalledWith(true);
    });
  });
  
  test('closes the modal when cancel is clicked', () => {
    const onClose = vi.fn();
    
    render(<SnippetModal onClose={onClose} />, {
      wrapper: createWrapper(),
    });
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
  
  test('adds and removes tags', () => {
    const onClose = vi.fn();
    
    render(<SnippetModal onClose={onClose} />, {
      wrapper: createWrapper(),
    });
    
    // Add a tag
    fireEvent.change(screen.getByPlaceholderText(/Add a tag/), {
      target: { value: 'test-tag' },
    });
    fireEvent.click(screen.getByText('Add'));
    
    // Check if tag was added
    expect(screen.getByText('test-tag')).toBeInTheDocument();
    
    // Add another tag
    fireEvent.change(screen.getByPlaceholderText(/Add a tag/), {
      target: { value: 'another-tag' },
    });
    fireEvent.click(screen.getByText('Add'));
    
    // Check if both tags are present
    expect(screen.getByText('test-tag')).toBeInTheDocument();
    expect(screen.getByText('another-tag')).toBeInTheDocument();
    
    // Remove a tag
    const removeButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(removeButtons[0]);
    
    // Check if tag was removed
    expect(screen.queryByText('test-tag')).not.toBeInTheDocument();
    expect(screen.getByText('another-tag')).toBeInTheDocument();
  });
});