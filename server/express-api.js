const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

// Database connection
const db = new sqlite3.Database('./chuck_library.db');

// Promisify db operations
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) return reject(err);
    resolve({ id: this.lastID, changes: this.changes });
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

// Middleware for error handling
const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// ================== ChucK Snippet Routes ==================

// Get all snippets with optional filtering
router.get('/snippets', asyncHandler(async (req, res) => {
  const { tag, search } = req.query;
  
  let sql = 'SELECT s.* FROM ChuckSnippets s';
  const params = [];
  
  if (tag) {
    sql += ' JOIN SnippetTags t ON s.id = t.snippet_id WHERE t.tag = ?';
    params.push(tag);
  }
  
  if (search && !tag) {
    sql += ' WHERE (s.name LIKE ? OR s.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  } else if (search) {
    sql += ' AND (s.name LIKE ? OR s.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  sql += ' ORDER BY s.updated_at DESC';
  
  const snippets = await dbAll(sql, params);
  
  // For each snippet, get its tags
  for (const snippet of snippets) {
    const tags = await dbAll(
      'SELECT tag FROM SnippetTags WHERE snippet_id = ?',
      [snippet.id]
    );
    snippet.tags = tags.map(t => t.tag);
  }
  
  res.json(snippets);
}));

// Get a specific snippet by ID
router.get('/snippets/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const snippet = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);
  
  if (!snippet) {
    return res.status(404).json({ error: 'Snippet not found' });
  }
  
  const tags = await dbAll(
    'SELECT tag FROM SnippetTags WHERE snippet_id = ?',
    [id]
  );
  
  snippet.tags = tags.map(t => t.tag);
  
  res.json(snippet);
}));

// Create a new snippet
router.post('/snippets', asyncHandler(async (req, res) => {
  const { name, code, description, tags = [] } = req.body;
  
  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }
  
  const existing = await dbGet('SELECT id FROM ChuckSnippets WHERE name = ?', [name]);
  if (existing) {
    return res.status(409).json({ error: 'A snippet with this name already exists' });
  }
  
  const timestamp = new Date().toISOString();
  
  const result = await dbRun(
    'INSERT INTO ChuckSnippets (name, code, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [name, code, description, timestamp, timestamp]
  );
  
  const snippetId = result.id;
  
  // Add tags if provided
  for (const tag of tags) {
    await dbRun(
      'INSERT INTO SnippetTags (snippet_id, tag) VALUES (?, ?)',
      [snippetId, tag]
    );
  }
  
  const newSnippet = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [snippetId]);
  newSnippet.tags = tags;
  
  res.status(201).json(newSnippet);
}));

// Update an existing snippet
router.put('/snippets/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, code, description, tags } = req.body;
  
  // Check if snippet exists
  const snippet = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);
  if (!snippet) {
    return res.status(404).json({ error: 'Snippet not found' });
  }
  
  // If name is changing, check if new name is available
  if (name && name !== snippet.name) {
    const existing = await dbGet('SELECT id FROM ChuckSnippets WHERE name = ?', [name]);
    if (existing) {
      return res.status(409).json({ error: 'A snippet with this name already exists' });
    }
  }
  
  const updates = [];
  const params = [];
  
  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  
  if (code) {
    updates.push('code = ?');
    params.push(code);
  }
  
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  
  updates.push('updated_at = ?');
  params.push(new Date().toISOString());
  
  params.push(id);
  
  if (updates.length > 0) {
    await dbRun(
      `UPDATE ChuckSnippets SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }
  
  // Update tags if provided
  if (Array.isArray(tags)) {
    // Delete all existing tags
    await dbRun('DELETE FROM SnippetTags WHERE snippet_id = ?', [id]);
    
    // Add new tags
    for (const tag of tags) {
      await dbRun(
        'INSERT INTO SnippetTags (snippet_id, tag) VALUES (?, ?)',
        [id, tag]
      );
    }
  }
  
  const updatedSnippet = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);
  const updatedTags = await dbAll('SELECT tag FROM SnippetTags WHERE snippet_id = ?', [id]);
  updatedSnippet.tags = updatedTags.map(t => t.tag);
  
  res.json(updatedSnippet);
}));

// Delete a snippet
router.delete('/snippets/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if snippet exists
  const snippet = await dbGet('SELECT * FROM ChuckSnippets WHERE id = ?', [id]);
  if (!snippet) {
    return res.status(404).json({ error: 'Snippet not found' });
  }
  
  // Delete tags first (due to foreign key constraint)
  await dbRun('DELETE FROM SnippetTags WHERE snippet_id = ?', [id]);
  
  // Delete the snippet
  await dbRun('DELETE FROM ChuckSnippets WHERE id = ?', [id]);
  
  res.status(204).end();
}));

// Execute a snippet
router.post('/snippets/:id/execute', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'ChucK session ID is required' });
  }
  
  const snippet = await dbGet('SELECT code FROM ChuckSnippets WHERE id = ?', [id]);
  if (!snippet) {
    return res.status(404).json({ error: 'Snippet not found' });
  }
  
  // This is a placeholder - in a real implementation, you would call
  // your ChucK execution service here
  // For now, we'll just return the code that would be executed
  
  res.json({
    message: 'Snippet execution requested',
    sessionId,
    code: snippet.code
  });
}));

// ================== Volume Routes ==================

// Get all volumes
router.get('/volumes', asyncHandler(async (req, res) => {
  const volumes = await dbAll('SELECT * FROM Volumes ORDER BY name');
  res.json(volumes);
}));

// Get a specific volume
router.get('/volumes/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const volume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
  
  if (!volume) {
    return res.status(404).json({ error: 'Volume not found' });
  }
  
  res.json(volume);
}));

// Create a new volume
router.post('/volumes', asyncHandler(async (req, res) => {
  const { name, physical_path, type = 'filesystem', description } = req.body;
  
  if (!name || !physical_path) {
    return res.status(400).json({ error: 'Name and physical path are required' });
  }
  
  // Check if volume with same name already exists
  const existing = await dbGet('SELECT id FROM Volumes WHERE name = ?', [name]);
  if (existing) {
    return res.status(409).json({ error: 'A volume with this name already exists' });
  }
  
  // Check if the physical path exists
  try {
    await statAsync(physical_path);
  } catch (err) {
    return res.status(400).json({ error: 'Physical path does not exist or is not accessible' });
  }
  
  const result = await dbRun(
    'INSERT INTO Volumes (name, physical_path, type, description) VALUES (?, ?, ?, ?)',
    [name, physical_path, type, description]
  );
  
  const newVolume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [result.id]);
  
  res.status(201).json(newVolume);
}));

// Update a volume
router.put('/volumes/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, physical_path, description, is_active } = req.body;
  
  // Check if volume exists
  const volume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
  if (!volume) {
    return res.status(404).json({ error: 'Volume not found' });
  }
  
  // If name is changing, check if new name is available
  if (name && name !== volume.name) {
    const existing = await dbGet('SELECT id FROM Volumes WHERE name = ?', [name]);
    if (existing) {
      return res.status(409).json({ error: 'A volume with this name already exists' });
    }
  }
  
  const updates = [];
  const params = [];
  
  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  
  if (physical_path) {
    // Check if the physical path exists
    try {
      await statAsync(physical_path);
    } catch (err) {
      return res.status(400).json({ error: 'Physical path does not exist or is not accessible' });
    }
    
    updates.push('physical_path = ?');
    params.push(physical_path);
  }
  
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active ? 1 : 0);
  }
  
  params.push(id);
  
  if (updates.length > 0) {
    await dbRun(
      `UPDATE Volumes SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }
  
  const updatedVolume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
  
  res.json(updatedVolume);
}));

// Delete a volume
router.delete('/volumes/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if volume exists
  const volume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
  if (!volume) {
    return res.status(404).json({ error: 'Volume not found' });
  }
  
  // Check if volume has any samples
  const sampleCount = await dbGet(
    'SELECT COUNT(*) as count FROM Samples WHERE volume_id = ?',
    [id]
  );
  
  if (sampleCount.count > 0) {
    return res.status(409).json({
      error: 'Cannot delete volume with existing samples',
      sampleCount: sampleCount.count
    });
  }
  
  await dbRun('DELETE FROM Volumes WHERE id = ?', [id]);
  
  res.status(204).end();
}));

// Scan a volume to index samples
router.post('/volumes/:id/scan', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if volume exists
  const volume = await dbGet('SELECT * FROM Volumes WHERE id = ?', [id]);
  if (!volume) {
    return res.status(404).json({ error: 'Volume not found' });
  }
  
  // This would normally be a background job, but for simplicity,
  // we'll implement it synchronously
  const scanResults = {
    totalFiles: 0,
    newFiles: 0,
    updatedFiles: 0,
    errors: []
  };
  
  async function scanDirectory(dirPath, relativePath = '') {
    try {
      const entries = await readdirAsync(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        const entryRelativePath = path.join(relativePath, entry.name).replace(/\\/g, '/');
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          await scanDirectory(entryPath, entryRelativePath);
        } else if (entry.isFile()) {
          // Check if it's an audio file (basic check)
          if ((/\.(wav|mp3|ogg|aif|aiff|flac)$/i).test(entry.name)) {
            scanResults.totalFiles++;
            
            try {
              const stats = await statAsync(entryPath);
              
              // Check if the file already exists in the database
              const existingSample = await dbGet(
                'SELECT id, file_size_bytes FROM Samples WHERE volume_id = ? AND relative_path = ?',
                [volume.id, entryRelativePath]
              );
              
              if (!existingSample) {
                // New file, add it to the database
                await dbRun(
                  `INSERT INTO Samples 
                  (volume_id, relative_path, filename, file_size_bytes, is_indexed, created_at) 
                  VALUES (?, ?, ?, ?, 1, ?)`,
                  [volume.id, entryRelativePath, entry.name, stats.size, new Date().toISOString()]
                );
                scanResults.newFiles++;
              } else if (existingSample.file_size_bytes !== stats.size) {
                // File has been updated, update the database
                await dbRun(
                  `UPDATE Samples 
                  SET file_size_bytes = ?, is_indexed = 1 
                  WHERE id = ?`,
                  [stats.size, existingSample.id]
                );
                scanResults.updatedFiles++;
              }
            } catch (err) {
              scanResults.errors.push({
                file: entryRelativePath,
                error: err.message
              });
            }
          }
        }
      }
    } catch (err) {
      scanResults.errors.push({
        directory: relativePath || '/',
        error: err.message
      });
    }
  }
  
  await scanDirectory(volume.physical_path);
  
  // Mark any files that no longer exist as not indexed
  const samples = await dbAll(
    'SELECT id, relative_path FROM Samples WHERE volume_id = ? AND is_indexed = 1',
    [volume.id]
  );
  
  for (const sample of samples) {
    const fullPath = path.join(volume.physical_path, sample.relative_path);
    try {
      await statAsync(fullPath);
    } catch (err) {
      // File doesn't exist anymore
      await dbRun(
        'UPDATE Samples SET is_indexed = 0 WHERE id = ?',
        [sample.id]
      );
    }
  }
  
  res.json({
    message: 'Volume scan completed',
    volumeId: volume.id,
    volumeName: volume.name,
    results: scanResults
  });
}));

// ================== Sample Routes ==================

// Get all samples with optional filtering
router.get('/samples', asyncHandler(async (req, res) => {
  const { volume_id, tag, search, limit = 100, offset = 0 } = req.query;
  
  let sql = 'SELECT s.* FROM Samples s';
  const params = [];
  
  const conditions = [];
  
  if (volume_id) {
    conditions.push('s.volume_id = ?');
    params.push(volume_id);
  }
  
  if (tag) {
    sql += ' JOIN SampleTags t ON s.id = t.sample_id';
    conditions.push('t.tag = ?');
    params.push(tag);
  }
  
  if (search) {
    conditions.push('(s.relative_path LIKE ? OR s.filename LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ' ORDER BY s.relative_path LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  const samples = await dbAll(sql, params);
  
  // Get volume information for each sample
  for (const sample of samples) {
    const volume = await dbGet(
      'SELECT name FROM Volumes WHERE id = ?',
      [sample.volume_id]
    );
    
    if (volume) {
      sample.volume_name = volume.name;
    }
    
    const tags = await dbAll(
      'SELECT tag FROM SampleTags WHERE sample_id = ?',
      [sample.id]
    );
    
    sample.tags = tags.map(t => t.tag);
  }
  
  // Get total count for pagination
  let countSql = 'SELECT COUNT(*) as count FROM Samples s';
  
  if (tag) {
    countSql += ' JOIN SampleTags t ON s.id = t.sample_id';
  }
  
  if (conditions.length > 0) {
    countSql += ' WHERE ' + conditions.join(' AND ');
  }
  
  const countParams = params.slice(0, params.length - 2); // Remove limit and offset
  const totalCount = await dbGet(countSql, countParams);
  
  res.json({
    samples,
    pagination: {
      total: totalCount.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// Get a specific sample
router.get('/samples/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const sample = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);
  
  if (!sample) {
    return res.status(404).json({ error: 'Sample not found' });
  }
  
  // Get volume information
  const volume = await dbGet(
    'SELECT name, physical_path FROM Volumes WHERE id = ?',
    [sample.volume_id]
  );
  
  if (volume) {
    sample.volume_name = volume.name;
    sample.full_path = path.join(volume.physical_path, sample.relative_path);
  }
  
  // Get tags
  const tags = await dbAll(
    'SELECT tag FROM SampleTags WHERE sample_id = ?',
    [id]
  );
  
  sample.tags = tags.map(t => t.tag);
  
  res.json(sample);
}));

// Update a sample
router.put('/samples/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tags } = req.body;
  
  // Check if sample exists
  const sample = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);
  if (!sample) {
    return res.status(404).json({ error: 'Sample not found' });
  }
  
  // Update tags if provided
  if (Array.isArray(tags)) {
    // Delete all existing tags
    await dbRun('DELETE FROM SampleTags WHERE sample_id = ?', [id]);
    
    // Add new tags
    for (const tag of tags) {
      await dbRun(
        'INSERT INTO SampleTags (sample_id, tag) VALUES (?, ?)',
        [id, tag]
      );
    }
  }
  
  // Update last accessed timestamp
  await dbRun(
    'UPDATE Samples SET last_accessed = ? WHERE id = ?',
    [new Date().toISOString(), id]
  );
  
  const updatedSample = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);
  const updatedTags = await dbAll('SELECT tag FROM SampleTags WHERE sample_id = ?', [id]);
  updatedSample.tags = updatedTags.map(t => t.tag);
  
  res.json(updatedSample);
}));

// Delete a sample
router.delete('/samples/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if sample exists
  const sample = await dbGet('SELECT * FROM Samples WHERE id = ?', [id]);
  if (!sample) {
    return res.status(404).json({ error: 'Sample not found' });
  }
  
  // Delete tags first (due to foreign key constraint)
  await dbRun('DELETE FROM SampleTags WHERE sample_id = ?', [id]);
  
  // Delete the sample
  await dbRun('DELETE FROM Samples WHERE id = ?', [id]);
  
  res.status(204).end();
}));

// Get a sample file
router.get('/samples/:id/file', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const sample = await dbGet(
    `SELECT s.*, v.physical_path AS volume_path 
     FROM Samples s
     JOIN Volumes v ON s.volume_id = v.id
     WHERE s.id = ?`,
    [id]
  );
  
  if (!sample) {
    return res.status(404).json({ error: 'Sample not found' });
  }
  
  const filePath = path.join(sample.volume_path, sample.relative_path);
  
  try {
    await statAsync(filePath);
  } catch (err) {
    return res.status(404).json({ error: 'Sample file not found on disk' });
  }
  
  // Update last accessed timestamp
  await dbRun(
    'UPDATE Samples SET last_accessed = ? WHERE id = ?',
    [new Date().toISOString(), id]
  );
  
  // Send the file
  res.sendFile(filePath);
}));

// Error handler
router.use((err, req, res, next) => {
  console.error(err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = router;