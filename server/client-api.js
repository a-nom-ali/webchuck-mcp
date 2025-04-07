/**
 * ChucK Library API Client
 * A client-side API interface for interacting with the ChucK Library server
 */

class ChuckLibraryApi {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a fetch request to the API
   * @private
   */
  async _fetch(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const fetchOptions = {
      ...defaultOptions,
      ...options,
    };
    
    if (options.body && typeof options.body === 'object') {
      fetchOptions.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(url, fetchOptions);
      
      // For 204 No Content responses, return null
      if (response.status === 204) {
        return null;
      }
      
      // For all other responses, try to parse JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        // If the response is not ok, throw an error with the response data
        if (!response.ok) {
          const error = new Error(data.error || 'API request failed');
          error.status = response.status;
          error.data = data;
          throw error;
        }
        
        return data;
      }
      
      // If the response is a file or other non-JSON content
      if (response.ok) {
        return response;
      }
      
      throw new Error(`Unexpected response: ${response.statusText}`);
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }
  
  // ================== Snippet Methods ==================
  
  /**
   * Get all snippets, optionally filtered by tag or search term
   */
  async getSnippets(options = {}) {
    const { tag, search } = options;
    const params = new URLSearchParams();
    
    if (tag) params.append('tag', tag);
    if (search) params.append('search', search);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this._fetch(`/snippets${queryString}`);
  }
  
  /**
   * Get a snippet by ID
   */
  async getSnippet(id) {
    return this._fetch(`/snippets/${id}`);
  }
  
  /**
   * Create a new snippet
   */
  async createSnippet(snippet) {
    return this._fetch('/snippets', {
      method: 'POST',
      body: snippet,
    });
  }
  
  /**
   * Update an existing snippet
   */
  async updateSnippet(id, snippet) {
    return this._fetch(`/snippets/${id}`, {
      method: 'PUT',
      body: snippet,
    });
  }
  
  /**
   * Delete a snippet
   */
  async deleteSnippet(id) {
    return this._fetch(`/snippets/${id}`, {
      method: 'DELETE',
    });
  }
  
  /**
   * Execute a snippet in a ChucK session
   */
  async executeSnippet(id, sessionId) {
    return this._fetch(`/snippets/${id}/execute`, {
      method: 'POST',
      body: { sessionId },
    });
  }
  
  // ================== Volume Methods ==================
  
  /**
   * Get all volumes
   */
  async getVolumes() {
    return this._fetch('/volumes');
  }
  
  /**
   * Get a volume by ID
   */
  async getVolume(id) {
    return this._fetch(`/volumes/${id}`);
  }
  
  /**
   * Create a new volume
   */
  async createVolume(volume) {
    return this._fetch('/volumes', {
      method: 'POST',
      body: volume,
    });
  }
  
  /**
   * Update an existing volume
   */
  async updateVolume(id, volume) {
    return this._fetch(`/volumes/${id}`, {
      method: 'PUT',
      body: volume,
    });
  }
  
  /**
   * Delete a volume
   */
  async deleteVolume(id) {
    return this._fetch(`/volumes/${id}`, {
      method: 'DELETE',
    });
  }
  
  /**
   * Scan a volume to index samples
   */
  async scanVolume(id) {
    return this._fetch(`/volumes/${id}/scan`, {
      method: 'POST',
    });
  }
  
  // ================== Sample Methods ==================
  
  /**
   * Get all samples, optionally filtered
   */
  async getSamples(options = {}) {
    const { volume_id, tag, search, limit, offset } = options;
    const params = new URLSearchParams();
    
    if (volume_id) params.append('volume_id', volume_id);
    if (tag) params.append('tag', tag);
    if (search) params.append('search', search);
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this._fetch(`/samples${queryString}`);
  }
  
  /**
   * Get a sample by ID
   */
  async getSample(id) {
    return this._fetch(`/samples/${id}`);
  }
  
  /**
   * Update a sample (tags)
   */
  async updateSample(id, sample) {
    return this._fetch(`/samples/${id}`, {
      method: 'PUT',
      body: sample,
    });
  }
  
  /**
   * Delete a sample
   */
  async deleteSample(id) {
    return this._fetch(`/samples/${id}`, {
      method: 'DELETE',
    });
  }
  
  /**
   * Get a sample file URL
   */
  getSampleFileUrl(id) {
    return `${this.baseUrl}/samples/${id}/file`;
  }
  
  /**
   * Load a sample into a ChucK session
   * This is a helper method that could be implemented in the ChucK integration layer
   */
  async loadSampleToChucK(id, sessionId) {
    const sample = await this.getSample(id);
    
    // This part would depend on how your ChucK integration works
    // For example, you might use the preloadSamples API
    
    // Return sample info for reference
    return {
      sampleId: id,
      sessionId,
      sampleName: sample.filename,
      virtualPath: `${sample.volume_name}/${sample.relative_path}`
    };
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChuckLibraryApi;
} else {
  window.ChuckLibraryApi = ChuckLibraryApi;
}