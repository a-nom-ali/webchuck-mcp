const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const sqlite3 = require('sqlite3').verbose();

// Mock the database
jest.mock('sqlite3', () => {
  const mockDb = {
    run: jest.fn((sql, params, callback) => callback(null, { lastID: 1, changes: 1 })),
    all: jest.fn((sql, params, callback) => callback(null, [])),
    get: jest.fn((sql, params, callback) => callback(null, null))
  };

  return { 
    verbose: () => ({ Database: jest.fn(() => mockDb) }),
    Database: jest.fn(() => mockDb)
  };
});

// Mock fs functions
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn().mockResolvedValue({ size: 1024 }),
    readdir: jest.fn().mockResolvedValue([])
  },
  stat: jest.fn((path, callback) => callback(null, { size: 1024 })),
  readdir: jest.fn((path, options, callback) => {
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    callback(null, []);
  })
}));

// Import the router (adjust path as needed)
const chuckRouter = require('./routes');

// Create an Express app for testing
const app = express();
app.use(express.json());
app.use('/api', chuckRouter);

describe('ChucK Library API', () => {
  // Clean up and setup before tests
  beforeAll(() => {
    // Any setup code
  });

  afterAll(() => {
    // Any cleanup code
  });

  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ================== Snippet Tests ==================
  
  describe('Snippet API', () => {
    test('GET /api/snippets should return a list of snippets', async () => {
      // Mock the database response
      const mockSnippets = [
        { id: 1, name: 'Test Snippet 1', code: 'SinOsc => dac;', description: 'A simple sine wave' },
        { id: 2, name: 'Test Snippet 2', code: 'SawOsc => dac;', description: 'A simple saw wave' }
      ];
      
      const mockDbAll = jest.spyOn(app.locals.db, 'all');
      mockDbAll.mockImplementation((sql, params, callback) => {
        if (sql.includes('FROM ChuckSnippets')) {
          callback(null, mockSnippets);
        } else if (sql.includes('FROM SnippetTags')) {
          callback(null, [{ tag: 'sine' }, { tag: 'oscillator' }]);
        }
      });
      
      const response = await request(app).get('/api/snippets');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Test Snippet 1');
      expect(response.body[0].tags).toContain('sine');
    });
    
    test('GET /api/snippets/:id should return a specific snippet', async () => {
      // Mock the database response
      const mockSnippet = { 
        id: 1, 
        name: 'Test Snippet', 
        code: 'SinOsc => dac;', 
        description: 'A simple sine wave' 
      };
      
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('FROM ChuckSnippets WHERE id')) {
          callback(null, mockSnippet);
        }
      });
      
      const mockDbAll = jest.spyOn(app.locals.db, 'all');
      mockDbAll.mockImplementation((sql, params, callback) => {
        if (sql.includes('FROM SnippetTags')) {
          callback(null, [{ tag: 'sine' }, { tag: 'oscillator' }]);
        }
      });
      
      const response = await request(app).get('/api/snippets/1');
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Snippet');
      expect(response.body.tags).toContain('sine');
    });
    
    test('POST /api/snippets should create a new snippet', async () => {
      const snippetData = {
        name: 'New Snippet',
        code: 'SinOsc => dac;',
        description: 'A test snippet',
        tags: ['test', 'sine']
      };
      
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('SELECT id FROM ChuckSnippets WHERE name')) {
          // No existing snippet with this name
          callback(null, null);
        } else if (sql.includes('SELECT * FROM ChuckSnippets WHERE id')) {
          // Return the newly created snippet
          callback(null, { 
            id: 1, 
            name: snippetData.name, 
            code: snippetData.code, 
            description: snippetData.description 
          });
        }
      });
      
      const response = await request(app)
        .post('/api/snippets')
        .send(snippetData);
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Snippet');
      expect(response.body.code).toBe('SinOsc => dac;');
      expect(response.body.tags).toEqual(['test', 'sine']);
    });
    
    test('PUT /api/snippets/:id should update an existing snippet', async () => {
      const snippetData = {
        name: 'Updated Snippet',
        code: 'SawOsc => dac;',
        description: 'An updated test snippet',
        tags: ['test', 'saw']
      };
      
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('SELECT * FROM ChuckSnippets WHERE id')) {
          // Return the existing snippet
          callback(null, { 
            id: 1, 
            name: 'Original Snippet', 
            code: 'SinOsc => dac;', 
            description: 'Original description' 
          });
        } else if (sql.includes('SELECT id FROM ChuckSnippets WHERE name')) {
          // No other snippet with this name
          callback(null, null);
        }
      });
      
      const response = await request(app)
        .put('/api/snippets/1')
        .send(snippetData);
      
      expect(response.status).toBe(200);
    });
    
    test('DELETE /api/snippets/:id should delete a snippet', async () => {
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('SELECT * FROM ChuckSnippets WHERE id')) {
          // Return the existing snippet
          callback(null, { id: 1, name: 'Test Snippet' });
        }
      });
      
      const response = await request(app).delete('/api/snippets/1');
      
      expect(response.status).toBe(204);
    });
    
    test('POST /api/snippets/:id/execute should execute a snippet', async () => {
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('SELECT code FROM ChuckSnippets WHERE id')) {
          // Return the snippet code
          callback(null, { code: 'SinOsc => dac;' });
        }
      });
      
      const response = await request(app)
        .post('/api/snippets/1/execute')
        .send({ sessionId: 'test-session' });
      
      expect(response.status).toBe(200);
      expect(response.body.code).toBe('SinOsc => dac;');
      expect(response.body.sessionId).toBe('test-session');
    });
  });
  
  // ================== Volume Tests ==================
  
  describe('Volume API', () => {
    test('GET /api/volumes should return a list of volumes', async () => {
      // Mock the database response
      const mockVolumes = [
        { id: 1, name: 'Test Volume 1', physical_path: '/test/path1', type: 'filesystem' },
        { id: 2, name: 'Test Volume 2', physical_path: '/test/path2', type: 'filesystem' }
      ];
      
      const mockDbAll = jest.spyOn(app.locals.db, 'all');
      mockDbAll.mockImplementation((sql, params, callback) => {
        if (sql.includes('FROM Volumes')) {
          callback(null, mockVolumes);
        }
      });
      
      const response = await request(app).get('/api/volumes');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Test Volume 1');
    });
    
    test('POST /api/volumes should create a new volume', async () => {
      const volumeData = {
        name: 'New Volume',
        physical_path: '/test/new-path',
        type: 'filesystem',
        description: 'A test volume'
      };
      
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('SELECT id FROM Volumes WHERE name')) {
          // No existing volume with this name
          callback(null, null);
        } else if (sql.includes('SELECT * FROM Volumes WHERE id')) {
          // Return the newly created volume
          callback(null, { 
            id: 1, 
            name: volumeData.name, 
            physical_path: volumeData.physical_path, 
            type: volumeData.type,
            description: volumeData.description 
          });
        }
      });
      
      const response = await request(app)
        .post('/api/volumes')
        .send(volumeData);
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Volume');
    });
    
    test('POST /api/volumes/:id/scan should scan a volume', async () => {
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('SELECT * FROM Volumes WHERE id')) {
          // Return the volume
          callback(null, { 
            id: 1, 
            name: 'Test Volume', 
            physical_path: '/test/path' 
          });
        } else {
          callback(null, null);
        }
      });
      
      const mockDbAll = jest.spyOn(app.locals.db, 'all');
      mockDbAll.mockImplementation((sql, params, callback) => {
        callback(null, []);
      });
      
      const response = await request(app).post('/api/volumes/1/scan');
      
      expect(response.status).toBe(200);
      expect(response.body.volumeId).toBe(1);
      expect(response.body.results).toBeDefined();
    });
  });
  
  // ================== Sample Tests ==================
  
  describe('Sample API', () => {
    test('GET /api/samples should return a list of samples', async () => {
      // Mock the database response
      const mockSamples = [
        { id: 1, volume_id: 1, relative_path: 'test/sample1.wav', filename: 'sample1.wav' },
        { id: 2, volume_id: 1, relative_path: 'test/sample2.wav', filename: 'sample2.wav' }
      ];
      
      const mockDbAll = jest.spyOn(app.locals.db, 'all');
      mockDbAll.mockImplementation((sql, params, callback) => {
        if (sql.includes('FROM Samples')) {
          callback(null, mockSamples);
        } else if (sql.includes('FROM SampleTags')) {
          callback(null, [{ tag: 'drums' }]);
        }
      });
      
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('SELECT name FROM Volumes')) {
          callback(null, { name: 'Test Volume' });
        } else if (sql.includes('COUNT(*) as count')) {
          callback(null, { count: 2 });
        }
      });
      
      const response = await request(app).get('/api/samples');
      
      expect(response.status).toBe(200);
      expect(response.body.samples).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
    });
    
    test('GET /api/samples/:id should return a specific sample', async () => {
      // Mock the database response
      const mockSample = { 
        id: 1, 
        volume_id: 1, 
        relative_path: 'test/sample.wav', 
        filename: 'sample.wav' 
      };
      
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('FROM Samples WHERE id')) {
          callback(null, mockSample);
        } else if (sql.includes('FROM Volumes WHERE id')) {
          callback(null, { 
            name: 'Test Volume',
            physical_path: '/test/path'
          });
        }
      });
      
      const mockDbAll = jest.spyOn(app.locals.db, 'all');
      mockDbAll.mockImplementation((sql, params, callback) => {
        if (sql.includes('FROM SampleTags')) {
          callback(null, [{ tag: 'drums' }, { tag: 'kick' }]);
        }
      });
      
      const response = await request(app).get('/api/samples/1');
      
      expect(response.status).toBe(200);
      expect(response.body.filename).toBe('sample.wav');
      expect(response.body.volume_name).toBe('Test Volume');
      expect(response.body.tags).toContain('drums');
    });
    
    test('PUT /api/samples/:id should update a sample', async () => {
      const sampleData = {
        tags: ['drums', 'kick', 'processed']
      };
      
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('FROM Samples WHERE id')) {
          // Return the existing sample
          callback(null, { 
            id: 1, 
            volume_id: 1, 
            relative_path: 'test/sample.wav', 
            filename: 'sample.wav' 
          });
        }
      });
      
      const response = await request(app)
        .put('/api/samples/1')
        .send(sampleData);
      
      expect(response.status).toBe(200);
    });
    
    test('GET /api/samples/:id/file should serve a sample file', async () => {
      // Mock the database response
      const mockSample = { 
        id: 1, 
        volume_id: 1, 
        relative_path: 'test/sample.wav', 
        filename: 'sample.wav',
        volume_path: '/test/path'
      };
      
      const mockDbGet = jest.spyOn(app.locals.db, 'get');
      mockDbGet.mockImplementation((sql, params, callback) => {
        if (sql.includes('FROM Samples s JOIN Volumes')) {
          callback(null, mockSample);
        }
      });
      
      // Mock Express res.sendFile
      const mockSendFile = jest.fn();
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        sendFile: mockSendFile
      };
      
      // Call the route handler directly since we need to mock res.sendFile
      await app._router.handle({ 
        method: 'GET', 
        url: '/api/samples/1/file',
        params: { id: '1' },
        query: {}
      }, res);
      
      expect(mockSendFile).toHaveBeenCalled();
      expect(mockSendFile.mock.calls[0][0]).toContain('/test/path/test/sample.wav');
    });
  });
});