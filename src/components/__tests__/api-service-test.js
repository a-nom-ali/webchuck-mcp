import { vi } from 'vitest';
import axios from 'axios';
import * as api from '../api';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    })),
  },
}));

describe('API Service', () => {
  let mockAxios;
  
  beforeEach(() => {
    mockAxios = axios.create();
    vi.clearAllMocks();
  });
  
  // Snippet API tests
  describe('Snippets API', () => {
    test('getSnippets calls the correct endpoint with parameters', async () => {
      mockAxios.get.mockResolvedValue({ data: ['snippet1', 'snippet2'] });
      
      const params = { search: 'test', tag: 'example' };
      await api.getSnippets(params);
      
      expect(mockAxios.get).toHaveBeenCalledWith('/snippets', { params });
    });
    
    test('getSnippet calls the correct endpoint with ID', async () => {
      mockAxios.get.mockResolvedValue({ data: { id: 1, name: 'Test Snippet' } });
      
      await api.getSnippet(1);
      
      expect(mockAxios.get).toHaveBeenCalledWith('/snippets/1');
    });
    
    test('createSnippet sends data to the correct endpoint', async () => {
      mockAxios.post.mockResolvedValue({ data: { id: 1, name: 'New Snippet' } });
      
      const snippetData = {
        name: 'New Snippet',
        code: 'SinOsc => dac;',
        description: 'Test',
        tags: ['test'],
      };
      
      await api.createSnippet(snippetData);
      
      expect(mockAxios.post).toHaveBeenCalledWith('/snippets', snippetData);
    });
    
    test('updateSnippet sends data to the correct endpoint with ID', async () => {
      mockAxios.put.mockResolvedValue({ data: { id: 1, name: 'Updated Snippet' } });
      
      const snippetData = {
        name: 'Updated Snippet',
        code: 'SinOsc => dac;',
      };
      
      await api.updateSnippet(1, snippetData);
      
      expect(mockAxios.put).toHaveBeenCalledWith('/snippets/1', snippetData);
    });
    
    test('deleteSnippet calls the correct endpoint with ID', async () => {
      mockAxios.delete.mockResolvedValue({});
      
      await api.deleteSnippet(1);
      
      expect(mockAxios.delete).toHaveBeenCalledWith('/snippets/1');
    });
    
    test('executeSnippet sends session ID to the correct endpoint', async () => {
      mockAxios.post.mockResolvedValue({ data: { message: 'Executed' } });
      
      await api.executeSnippet(1, 'test-session');
      
      expect(mockAxios.post).toHaveBeenCalledWith('/snippets/1/execute', { sessionId: 'test-session' });
    });
  });
  
  // Volume API tests
  describe('Volumes API', () => {
    test('getVolumes calls the correct endpoint', async () => {
      mockAxios.get.mockResolvedValue({ data: ['volume1', 'volume2'] });
      
      await api.getVolumes();
      
      expect(mockAxios.get).toHaveBeenCalledWith('/volumes');
    });
    
    test('createVolume sends data to the correct endpoint', async () => {
      mockAxios.post.mockResolvedValue({ data: { id: 1, name: 'New Volume' } });
      
      const volumeData = {
        name: 'New Volume',
        physical_path: '/test/path',
        type: 'filesystem',
      };
      
      await api.createVolume(volumeData);
      
      expect(mockAxios.post).toHaveBeenCalledWith('/volumes', volumeData);
    });
    
    test('scanVolume calls the correct endpoint with ID', async () => {
      mockAxios.post.mockResolvedValue({ data: { results: { newFiles: 5 } } });
      
      await api.scanVolume(1);
      
      expect(mockAxios.post).toHaveBeenCalledWith('/volumes/1/scan');
    });
  });
  
  // Sample API tests
  describe('Samples API', () => {
    test('getSamples calls the correct endpoint with parameters', async () => {
      mockAxios.get.mockResolvedValue({ 
        data: { 
          samples: ['sample1', 'sample2'],
          pagination: { total: 2, limit: 10, offset: 0 }
        } 
      });
      
      const params = { volume_id: 1, limit: 10 };
      await api.getSamples(params);
      
      expect(mockAxios.get).toHaveBeenCalledWith('/samples', { params });
    });
    
    test('getSampleFileUrl returns the correct URL', () => {
      const url = api.getSampleFileUrl(1);
      expect(url).toBe('/api/samples/1/file');
    });
  });
  
  // Error handling test
  describe('Error handling', () => {
    test('API interceptor handles errors', async () => {
      // Get the error handler function that was registered
      const errorHandler = mockAxios.interceptors.response.use.mock.calls[0][1];
      
      // Create a mock error
      const error = {
        response: {
          data: {
            error: 'Test error message'
          }
        }
      };
      
      // Mock console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Call the error handler
      expect(() => errorHandler(error)).rejects.toEqual(error);
      
      // Check if error was logged
      expect(consoleSpy).toHaveBeenCalled();
      
      // Restore console.error
      consoleSpy.mockRestore();
    });
  });
});