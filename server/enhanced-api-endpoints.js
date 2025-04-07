/**
 * Enhanced API Endpoints for WebChucK Library
 * 
 * This file contains additional endpoints to support advanced features:
 * - RAG for code generation
 * - Enhanced sample management
 * - Performance analysis
 * - Event tracking
 */

const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

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

// ================== Snippet Embedding Routes ==================

// Store embedding for a snippet
router.post('/snippets/:id/embedding', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { embedding_vector, embedding_type } = req.body;
  
  if (!embedding_vector || !embedding_type) {
    return res.status(400).json({ error: 'Embedding vector and type are required' });
  }
  
  // Check if snippet exists
  const snippet = await dbGet('SELECT id FROM ChuckSnippets WHERE id = ?', [id]);
  if (!snippet) {
    return res.status(404).json({ error: 'Snippet not found' });
  }
  
  // Check if embedding already exists for this type
  const existing = await dbGet(
    'SELECT id FROM SnippetEmbeddings WHERE snippet_id = ? AND embedding_type = ?',
    [id, embedding_type]
  );
  
  if (existing) {
    // Update existing embedding
    await dbRun(
      'UPDATE SnippetEmbeddings SET embedding_vector = ? WHERE id = ?',
      [embedding_vector, existing.id]
    );
  } else {
    // Create new embedding
    await dbRun(
      'INSERT INTO SnippetEmbeddings (snippet_id, embedding_vector, embedding_type) VALUES (?, ?, ?)',
      [id, embedding_vector, embedding_type]
    );
  }
  
  res.status(200).json({ message: 'Embedding stored successfully' });
}));

// Get embeddings for a snippet
router.get('/snippets/:id/embeddings', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type } = req.query;
  
  let sql = 'SELECT * FROM SnippetEmbeddings WHERE snippet_id = ?';
  const params = [id];
  
  if (type) {
    sql += ' AND embedding_type = ?';
    params.push(type);
  }
  
  const embeddings = await dbAll(sql, params);
  
  res.json(embeddings);
}));

// Search snippets by embedding similarity
router.post('/snippets/search-by-embedding', asyncHandler(async (req, res) => {
  const { embedding_vector, embedding_type, limit = 10 } = req.body;
  
  if (!embedding_vector || !embedding_type) {
    return res.status(400).json({ error: 'Embedding vector and type are required' });
  }
  
  // This is a simplified placeholder for similarity search
  // In a real implementation, you would use a vector database or compute similarity scores
  // For now, we'll just return snippets that have embeddings of the requested type
  
  const snippets = await dbAll(`
    SELECT s.*, e.embedding_vector 
    FROM ChuckSnippets s
    JOIN SnippetEmbeddings e ON s.id = e.snippet_id
    WHERE e.embedding_type = ?
    LIMIT ?
  `, [embedding_type, limit]);
  
  res.json(snippets);
}));

// ================== Musical Pattern Routes ==================

// Get all musical patterns
router.get('/patterns', asyncHandler(async (req, res) => {
  const { type } = req.query;
  
  let sql = 'SELECT * FROM MusicalPatterns';
  const params = [];
  
  if (type) {
    sql += ' WHERE pattern_type = ?';
    params.push(type);
  }
  
  sql += ' ORDER BY name';
  
  const patterns = await dbAll(sql, params);
  res.json(patterns);
}));

// Get a specific pattern
router.get('/patterns/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const pattern = await dbGet('SELECT * FROM MusicalPatterns WHERE id = ?', [id]);
  
  if (!pattern) {
    return res.status(404).json({ error: 'Pattern not found' });
  }
  
  res.json(pattern);
}));

// Create a new pattern
router.post('/patterns', asyncHandler(async (req, res) => {
  const { name, pattern_type, code, description, embedding_vector } = req.body;
  
  if (!name || !pattern_type || !code) {
    return res.status(400).json({ error: 'Name, pattern type, and code are required' });
  }
  
  const result = await dbRun(
    'INSERT INTO MusicalPatterns (name, pattern_type, code, description, embedding_vector) VALUES (?, ?, ?, ?, ?)',
    [name, pattern_type, code, description, embedding_vector]
  );
  
  const newPattern = await dbGet('SELECT * FROM MusicalPatterns WHERE id = ?', [result.id]);
  
  res.status(201).json(newPattern);
}));

// Update a pattern
router.put('/patterns/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, pattern_type, code, description, embedding_vector } = req.body;
  
  // Check if pattern exists
  const pattern = await dbGet('SELECT * FROM MusicalPatterns WHERE id = ?', [id]);
  if (!pattern) {
    return res.status(404).json({ error: 'Pattern not found' });
  }
  
  const updates = [];
  const params = [];
  
  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  
  if (pattern_type) {
    updates.push('pattern_type = ?');
    params.push(pattern_type);
  }
  
  if (code) {
    updates.push('code = ?');
    params.push(code);
  }
  
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  
  if (embedding_vector !== undefined) {
    updates.push('embedding_vector = ?');
    params.push(embedding_vector);
  }
  
  params.push(id);
  
  if (updates.length > 0) {
    await dbRun(
      `UPDATE MusicalPatterns SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }
  
  const updatedPattern = await dbGet('SELECT * FROM MusicalPatterns WHERE id = ?', [id]);
  
  res.json(updatedPattern);
}));

// Delete a pattern
router.delete('/patterns/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Check if pattern exists
  const pattern = await dbGet('SELECT * FROM MusicalPatterns WHERE id = ?', [id]);
  if (!pattern) {
    return res.status(404).json({ error: 'Pattern not found' });
  }
  
  await dbRun('DELETE FROM MusicalPatterns WHERE id = ?', [id]);
  
  res.status(204).end();
}));

// ================== Usage Context Routes ==================

// Record usage context
router.post('/usage-context', asyncHandler(async (req, res) => {
  const { snippet_id, pattern_id, context_description } = req.body;
  
  if ((!snippet_id && !pattern_id) || !context_description) {
    return res.status(400).json({ error: 'Either snippet_id or pattern_id and context_description are required' });
  }
  
  // Check if this context already exists
  const existing = await dbGet(
    'SELECT * FROM UsageContext WHERE snippet_id = ? AND pattern_id = ? AND context_description = ?',
    [snippet_id || null, pattern_id || null, context_description]
  );
  
  if (existing) {
    // Update frequency and last_used
    await dbRun(
      'UPDATE UsageContext SET frequency = frequency + 1, last_used = CURRENT_TIMESTAMP WHERE id = ?',
      [existing.id]
    );
    
    const updated = await dbGet('SELECT * FROM UsageContext WHERE id = ?', [existing.id]);
    return res.json(updated);
  }
  
  // Create new usage context
  const result = await dbRun(
    'INSERT INTO UsageContext (snippet_id, pattern_id, context_description) VALUES (?, ?, ?)',
    [snippet_id || null, pattern_id || null, context_description]
  );
  
  const newContext = await dbGet('SELECT * FROM UsageContext WHERE id = ?', [result.id]);
  
  res.status(201).json(newContext);
}));

// Get usage contexts for a snippet or pattern
router.get('/usage-context', asyncHandler(async (req, res) => {
  const { snippet_id, pattern_id } = req.query;
  
  if (!snippet_id && !pattern_id) {
    return res.status(400).json({ error: 'Either snippet_id or pattern_id is required' });
  }
  
  let sql = 'SELECT * FROM UsageContext WHERE ';
  const params = [];
  
  if (snippet_id) {
    sql += 'snippet_id = ?';
    params.push(snippet_id);
  } else {
    sql += 'pattern_id = ?';
    params.push(pattern_id);
  }
  
  sql += ' ORDER BY frequency DESC, last_used DESC';
  
  const contexts = await dbAll(sql, params);
  
  res.json(contexts);
}));

// ================== Sample Analytics Routes ==================

// Store analytics for a sample
router.post('/samples/:id/analytics', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    duration_seconds, 
    peak_amplitude, 
    average_amplitude,
    spectral_centroid,
    dominant_frequency,
    transient_points
  } = req.body;
  
  // Check if sample exists
  const sample = await dbGet('SELECT id FROM Samples WHERE id = ?', [id]);
  if (!sample) {
    return res.status(404).json({ error: 'Sample not found' });
  }
  
  // Check if analytics already exist
  const existing = await dbGet('SELECT id FROM SampleAnalytics WHERE sample_id = ?', [id]);
  
  if (existing) {
    // Update existing analytics
    await dbRun(
      `UPDATE SampleAnalytics SET 
        duration_seconds = ?, 
        peak_amplitude = ?, 
        average_amplitude = ?,
        spectral_centroid = ?,
        dominant_frequency = ?,
        transient_points = ?,
        is_analyzed = 1,
        analysis_date = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        duration_seconds,
        peak_amplitude,
        average_amplitude,
        spectral_centroid,
        dominant_frequency,
        JSON.stringify(transient_points),
        existing.id
      ]
    );
  } else {
    // Create new analytics
    await dbRun(
      `INSERT INTO SampleAnalytics (
        sample_id, 
        duration_seconds, 
        peak_amplitude, 
        average_amplitude,
        spectral_centroid,
        dominant_frequency,
        transient_points,
        is_analyzed,
        analysis_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
      [
        id,
        duration_seconds,
        peak_amplitude,
        average_amplitude,
        spectral_centroid,
        dominant_frequency,
        JSON.stringify(transient_points)
      ]
    );
  }
  
  const analytics = await dbGet(
    'SELECT * FROM SampleAnalytics WHERE sample_id = ?',
    [id]
  );
  
  res.json(analytics);
}));

// Get analytics for a sample
router.get('/samples/:id/analytics', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const analytics = await dbGet('SELECT * FROM SampleAnalytics WHERE sample_id = ?', [id]);
  
  if (!analytics) {
    return res.status(404).json({ error: 'Analytics not found for this sample' });
  }
  
  // Parse transient_points JSON if it exists
  if (analytics.transient_points) {
    try {
      analytics.transient_points = JSON.parse(analytics.transient_points);
    } catch (e) {
      // Leave as string if parsing fails
    }
  }
  
  res.json(analytics);
}));

// ================== Sample Relationships Routes ==================

// Record relationship between two samples
router.post('/sample-relationships', asyncHandler(async (req, res) => {
  const { sample_id_1, sample_id_2, relationship_strength } = req.body;
  
  if (!sample_id_1 || !sample_id_2) {
    return res.status(400).json({ error: 'Both sample IDs are required' });
  }
  
  if (sample_id_1 === sample_id_2) {
    return res.status(400).json({ error: 'Cannot create relationship between the same sample' });
  }
  
  // Ensure consistent ordering (smaller ID first)
  const [firstId, secondId] = [sample_id_1, sample_id_2].sort((a, b) => a - b);
  
  // Check if relationship already exists
  const existing = await dbGet(
    'SELECT * FROM SampleRelationships WHERE sample_id_1 = ? AND sample_id_2 = ?',
    [firstId, secondId]
  );
  
  if (existing) {
    // Update relationship
    await dbRun(
      `UPDATE SampleRelationships SET 
        relationship_strength = ?,
        co_occurrence_count = co_occurrence_count + 1,
        last_updated = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        relationship_strength || existing.relationship_strength,
        existing.id
      ]
    );
  } else {
    // Create new relationship
    await dbRun(
      `INSERT INTO SampleRelationships (
        sample_id_1,
        sample_id_2,
        relationship_strength,
        co_occurrence_count,
        last_updated
      ) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)`,
      [
        firstId,
        secondId,
        relationship_strength || 0.5 // Default strength if not provided
      ]
    );
  }
  
  const relationship = await dbGet(
    'SELECT * FROM SampleRelationships WHERE sample_id_1 = ? AND sample_id_2 = ?',
    [firstId, secondId]
  );
  
  res.json(relationship);
}));

// Get related samples
router.get('/samples/:id/related', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { min_strength = 0, limit = 10 } = req.query;
  
  // Get relationships where this sample is either sample_id_1 or sample_id_2
  const relationships = await dbAll(`
    SELECT 
      sr.*,
      CASE 
        WHEN sr.sample_id_1 = ? THEN sr.sample_id_2
        ELSE sr.sample_id_1
      END as related_sample_id
    FROM SampleRelationships sr
    WHERE (sr.sample_id_1 = ? OR sr.sample_id_2 = ?)
    AND sr.relationship_strength >= ?
    ORDER BY sr.relationship_strength DESC, sr.co_occurrence_count DESC
    LIMIT ?
  `, [id, id, id, min_strength, limit]);
  
  // Get details of related samples
  for (const relationship of relationships) {
    const relatedSampleId = relationship.related_sample_id;
    const sample = await dbGet('SELECT * FROM Samples WHERE id = ?', [relatedSampleId]);
    if (sample) {
      relationship.sample = sample;
    }
  }
  
  res.json(relationships);
}));

// ================== Performance Metrics Routes ==================

// Record performance metrics
router.post('/snippets/:id/performance', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    execution_time_ms, 
    peak_cpu_usage, 
    memory_usage_kb,
    buffer_underruns,
    device_info,
    optimization_suggestions
  } = req.body;
  
  // Check if snippet exists
  const snippet = await dbGet('SELECT id FROM ChuckSnippets WHERE id = ?', [id]);
  if (!snippet) {
    return res.status(404).json({ error: 'Snippet not found' });
  }
  
  // Create performance record
  const result = await dbRun(
    `INSERT INTO PerformanceMetrics (
      snippet_id,
      execution_time_ms,
      peak_cpu_usage,
      memory_usage_kb,
      buffer_underruns,
      device_info,
      optimization_suggestions
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      execution_time_ms,
      peak_cpu_usage,
      memory_usage_kb,
      buffer_underruns || 0,
      JSON.stringify(device_info || {}),
      JSON.stringify(optimization_suggestions || [])
    ]
  );
  
  const metrics = await dbGet('SELECT * FROM PerformanceMetrics WHERE id = ?', [result.id]);
  
  // Parse JSON fields
  if (metrics.device_info) {
    try {
      metrics.device_info = JSON.parse(metrics.device_info);
    } catch (e) {
      // Leave as string if parsing fails
    }
  }
  
  if (metrics.optimization_suggestions) {
    try {
      metrics.optimization_suggestions = JSON.parse(metrics.optimization_suggestions);
    } catch (e) {
      // Leave as string if parsing fails
    }
  }
  
  res.status(201).json(metrics);
}));

// Get performance metrics for a snippet
router.get('/snippets/:id/performance', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 10 } = req.query;
  
  const metrics = await dbAll(
    'SELECT * FROM PerformanceMetrics WHERE snippet_id = ? ORDER BY execution_date DESC LIMIT ?',
    [id, limit]
  );
  
  // Parse JSON fields
  for (const metric of metrics) {
    if (metric.device_info) {
      try {
        metric.device_info = JSON.parse(metric.device_info);
      } catch (e) {
        // Leave as string if parsing fails
      }
    }
    
    if (metric.optimization_suggestions) {
      try {
        metric.optimization_suggestions = JSON.parse(metric.optimization_suggestions);
      } catch (e) {
        // Leave as string if parsing fails
      }
    }
  }
  
  res.json(metrics);
}));

// Get performance comparison
router.get('/snippets/:id/performance/compare', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get average and latest metrics
  const averageMetrics = await dbGet(`
    SELECT 
      AVG(execution_time_ms) as avg_execution_time,
      AVG(peak_cpu_usage) as avg_cpu_usage,
      AVG(memory_usage_kb) as avg_memory_usage,
      SUM(buffer_underruns) as total_underruns,
      COUNT(*) as execution_count
    FROM PerformanceMetrics
    WHERE snippet_id = ?
  `, [id]);
  
  const latestMetrics = await dbGet(`
    SELECT *
    FROM PerformanceMetrics
    WHERE snippet_id = ?
    ORDER BY execution_date DESC
    LIMIT 1
  `, [id]);
  
  // Parse JSON fields
  if (latestMetrics?.device_info) {
    try {
      latestMetrics.device_info = JSON.parse(latestMetrics.device_info);
    } catch (e) {
      // Leave as string if parsing fails
    }
  }
  
  if (latestMetrics?.optimization_suggestions) {
    try {
      latestMetrics.optimization_suggestions = JSON.parse(latestMetrics.optimization_suggestions);
    } catch (e) {
      // Leave as string if parsing fails
    }
  }
  
  res.json({
    average: averageMetrics,
    latest: latestMetrics
  });
}));

// ================== Event Logs Routes ==================

// Record an event
router.post('/events', asyncHandler(async (req, res) => {
  const { 
    session_id, 
    event_type, 
    event_data, 
    snippet_id, 
    sample_id 
  } = req.body;
  
  if (!session_id || !event_type) {
    return res.status(400).json({ error: 'Session ID and event type are required' });
  }
  
  const result = await dbRun(
    `INSERT INTO EventLogs (
      session_id,
      event_type,
      event_data,
      snippet_id,
      sample_id
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      session_id,
      event_type,
      JSON.stringify(event_data || {}),
      snippet_id || null,
      sample_id || null
    ]
  );
  
  const event = await dbGet('SELECT * FROM EventLogs WHERE id = ?', [result.id]);
  
  // Parse event_data
  if (event.event_data) {
    try {
      event.event_data = JSON.parse(event.event_data);
    } catch (e) {
      // Leave as string if parsing fails
    }
  }
  
  res.status(201).json(event);
}));

// Get events for a session
router.get('/events', asyncHandler(async (req, res) => {
  const { session_id, event_type, snippet_id, sample_id, limit = 100 } = req.query;
  
  if (!session_id && !event_type && !snippet_id && !sample_id) {
    return res.status(400).json({ error: 'At least one filter parameter is required' });
  }
  
  let sql = 'SELECT * FROM EventLogs WHERE ';
  const conditions = [];
  const params = [];
  
  if (session_id) {
    conditions.push('session_id = ?');
    params.push(session_id);
  }
  
  if (event_type) {
    conditions.push('event_type = ?');
    params.push(event_type);
  }
  
  if (snippet_id) {
    conditions.push('snippet_id = ?');
    params.push(snippet_id);
  }
  
  if (sample_id) {
    conditions.push('sample_id = ?');
    params.push(sample_id);
  }
  
  sql += conditions.join(' AND ');
  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);
  
  const events = await dbAll(sql, params);
  
  // Parse event_data for each event
  for (const event of events) {
    if (event.event_data) {
      try {
        event.event_data = JSON.parse(event.event_data);
      } catch (e) {
        // Leave as string if parsing fails
      }
    }
  }
  
  res.json(events);
}));

// ================== Cache Strategy Routes ==================

// Set cache strategy for a sample
router.post('/samples/:id/cache-strategy', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { priority_level, cache_status, compression_level } = req.body;
  
  // Check if sample exists
  const sample = await dbGet('SELECT id FROM Samples WHERE id = ?', [id]);
  if (!sample) {
    return res.status(404).json({ error: 'Sample not found' });
  }
  
  // Check if strategy already exists
  const existing = await dbGet('SELECT id FROM CacheStrategy WHERE sample_id = ?', [id]);
  
  if (existing) {
    // Update existing strategy
    const updates = [];
    const params = [];
    
    if (priority_level !== undefined) {
      updates.push('priority_level = ?');
      params.push(priority_level);
    }
    
    if (cache_status) {
      updates.push('cache_status = ?');
      params.push(cache_status);
    }
    
    if (compression_level !== undefined) {
      updates.push('compression_level = ?');
      params.push(compression_level);
    }
    
    updates.push('last_accessed = CURRENT_TIMESTAMP');
    updates.push('access_frequency = access_frequency + 1');
    
    params.push(existing.id);
    
    await dbRun(
      `UPDATE CacheStrategy SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  } else {
    // Create new strategy
    await dbRun(
      `INSERT INTO CacheStrategy (
        sample_id,
        priority_level,
        cache_status,
        compression_level,
        last_accessed,
        access_frequency
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1)`,
      [
        id,
        priority_level || 1,
        cache_status || 'none',
        compression_level || 0
      ]
    );
  }
  
  const strategy = await dbGet('SELECT * FROM CacheStrategy WHERE sample_id = ?', [id]);
  
  res.json(strategy);
}));

// Get cache strategy for a sample
router.get('/samples/:id/cache-strategy', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const strategy = await dbGet('SELECT * FROM CacheStrategy WHERE sample_id = ?', [id]);
  
  if (!strategy) {
    return res.status(404).json({ error: 'No cache strategy found for this sample' });
  }
  
  res.json(strategy);
}));

// Get samples to cache
router.get('/cache/recommended', asyncHandler(async (req, res) => {
  const { min_priority = 1, limit = 20 } = req.query;
  
  // Get samples with high priority or high access frequency
  const samples = await dbAll(`
    SELECT 
      s.*,
      cs.priority_level,
      cs.cache_status,
      cs.compression_level,
      cs.access_frequency
    FROM Samples s
    JOIN CacheStrategy cs ON s.id = cs.sample_id
    WHERE cs.priority_level >= ? AND cs.cache_status != 'cached'
    ORDER BY cs.priority_level DESC, cs.access_frequency DESC
    LIMIT ?
  `, [min_priority, limit]);
  
  res.json(samples);
}));

module.exports = router;