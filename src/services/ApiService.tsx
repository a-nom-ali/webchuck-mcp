import { toast } from 'react-hot-toast';

class ApiService {
  private baseUrl: any;
  constructor() {
    // Get API base URL from environment or use default
    this.baseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3031/api';
  }

  async request(endpoint:any, options:any = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Default options
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };
    
    const fetchOptions = { 
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };
    
    try {
      const response = await fetch(url, fetchOptions);
      
      // Handle non-2xx responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }
      
      // Parse JSON response if content exists
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error('API request failed:', error);
      toast.error(`API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  // Samples API
  async getSamples() {
    return this.request('/samples');
  }

  async searchSamples(query:any) {
    return this.request(`/samples/search?q=${encodeURIComponent(query)}`);
  }

  async uploadSample(formData:any) {
    return this.request('/samples/upload', {
      method: 'POST',
      headers: {
        // Don't set Content-Type as FormData will set it with boundary
      },
      body: formData,
    });
  }

  // Code Library API
  async getLibraryItems() {
    return this.request('/library');
  }

  async saveToLibrary(name:string, code:string) {
    return this.request('/library', {
      method: 'POST',
      body: JSON.stringify({ name, code }),
    });
  }

  async getLibraryItem(id:any) {
    return this.request(`/library/${id}`);
  }

  async deleteLibraryItem(id:any) {
    return this.request(`/library/${id}`, {
      method: 'DELETE',
    });
  }

  // Example code API
  async getExamples() {
    return this.request('/examples');
  }

  async getExample(id:any) {
    return this.request(`/examples/${id}`);
  }
}

// Create singleton instance
const apiService = new ApiService();
export default apiService;