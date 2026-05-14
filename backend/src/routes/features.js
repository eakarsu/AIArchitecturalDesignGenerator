const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { aiRateLimiter, generalLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter, parseAIJson } = require('../utils/aiHelper');
const features = require('../config/features');

// ── Validation helper ──────────────────────────────────────────
function validateFeatureData(featureConfig, data) {
  if (!featureConfig || !featureConfig.fields) return [];
  const errors = [];
  for (const field of featureConfig.fields) {
    const val = data[field.name];
    if (field.required && (val === undefined || val === null || val === '')) {
      errors.push(`${field.label || field.name} is required.`);
      continue;
    }
    if (val !== undefined && val !== null && val !== '') {
      if (field.type === 'number') {
        const n = Number(val);
        if (isNaN(n)) errors.push(`${field.label || field.name} must be a number.`);
      }
      if (field.type === 'select' && field.options && field.options.length > 0) {
        if (!field.options.includes(val)) {
          errors.push(`${field.label || field.name} must be one of: ${field.options.join(', ')}.`);
        }
      }
    }
  }
  return errors;
}

function createFeatureRouter(featureConfig) {
  const router = express.Router();
  const { tableName, aiPromptTemplate } = featureConfig;

  // GET / - List all items with pagination, search, and advanced filters
  router.get('/', authMiddleware, generalLimiter, async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || '';
      const dateFrom = req.query.dateFrom || '';
      const dateTo = req.query.dateTo || '';
      const favoritesOnly = req.query.favoritesOnly === 'true';
      const userId = req.user.id; // Always from token, never from query

      let query = `SELECT t.* FROM ${tableName} t`;
      let countQuery = `SELECT COUNT(*) FROM ${tableName} t`;
      const conditions = [];
      const params = [];
      const countParams = [];

      if (favoritesOnly) {
        const safeUserId = parseInt(userId, 10);
        query = `SELECT t.* FROM ${tableName} t INNER JOIN favorites f ON f.item_id = t.id AND f.feature_key = $1 AND f.user_id = $2`;
        countQuery = `SELECT COUNT(*) FROM ${tableName} t INNER JOIN favorites f ON f.item_id = t.id AND f.feature_key = $1 AND f.user_id = $2`;
        params.push(featureConfig.key, safeUserId);
        countParams.push(featureConfig.key, safeUserId);
      }

      if (search) {
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
        conditions.push(`(t.name ILIKE $${params.length} OR t.description ILIKE $${params.length})`);
      }

      if (status) {
        params.push(status);
        countParams.push(status);
        conditions.push(`t.status = $${params.length}`);
      }

      if (dateFrom) {
        params.push(dateFrom);
        countParams.push(dateFrom);
        conditions.push(`t.created_at >= $${params.length}`);
      }

      if (dateTo) {
        params.push(dateTo);
        countParams.push(dateTo);
        conditions.push(`t.created_at <= ($${params.length}::date + interval '1 day')`);
      }

      if (conditions.length > 0) {
        const whereClause = ` WHERE ${conditions.join(' AND ')}`;
        query += whereClause;
        countQuery += whereClause;
      }

      query += ` ORDER BY t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const [dataResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);

      res.json({
        data: dataResult.rows,
        items: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error(`Error listing ${tableName}:`, err.message);
      res.status(500).json({ error: 'Failed to fetch items.' });
    }
  });

  // GET /:id - Get single item
  router.get('/:id', authMiddleware, generalLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      res.json({ item: result.rows[0] });
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err.message);
      res.status(500).json({ error: 'Failed to fetch item.' });
    }
  });

  // POST / - Create new item
  router.post('/', authMiddleware, generalLimiter, async (req, res) => {
    try {
      const { name, description, status } = req.body;
      const user_id = req.user.id;

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Name is required.' });
      }

      // Validate feature-specific fields from req.body.data or top-level
      const dataFields = req.body.data || req.body;
      const fieldErrors = validateFeatureData(featureConfig, dataFields);
      if (fieldErrors.length > 0) {
        return res.status(400).json({ error: fieldErrors.join(' '), details: fieldErrors });
      }

      // Build data object from feature fields
      const data = {};
      if (featureConfig.fields) {
        for (const field of featureConfig.fields) {
          if (dataFields[field.name] !== undefined) {
            data[field.name] = dataFields[field.name];
          }
        }
      }
      // Merge any explicit data payload
      if (req.body.data && typeof req.body.data === 'object') {
        Object.assign(data, req.body.data);
      }

      const result = await pool.query(
        `INSERT INTO ${tableName} (name, description, data, status, user_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name.trim(), description || '', data, status || 'draft', user_id]
      );

      const created = result.rows[0];

      // Log activity
      await pool.query(
        `INSERT INTO activity_log (user_id, action, feature_key, item_id, item_name) VALUES ($1, $2, $3, $4, $5)`,
        [user_id, 'created', featureConfig.key, created.id, name]
      ).catch(() => {});

      res.status(201).json({ item: created });
    } catch (err) {
      console.error(`Error creating ${tableName}:`, err.message);
      res.status(500).json({ error: 'Failed to create item.' });
    }
  });

  // PUT /:id - Update item
  router.put('/:id', authMiddleware, generalLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, data, status } = req.body;

      // Validate if name provided
      if (name !== undefined && (!name || !name.trim())) {
        return res.status(400).json({ error: 'Name cannot be empty.' });
      }

      // Validate feature-specific fields if data provided
      if (data && typeof data === 'object') {
        const fieldErrors = validateFeatureData(featureConfig, data);
        if (fieldErrors.length > 0) {
          return res.status(400).json({ error: fieldErrors.join(' '), details: fieldErrors });
        }
      }

      const result = await pool.query(
        `UPDATE ${tableName}
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             data = COALESCE($3, data),
             status = COALESCE($4, status),
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [name ? name.trim() : null, description, data, status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const updated = result.rows[0];

      // Log activity
      await pool.query(
        `INSERT INTO activity_log (user_id, action, feature_key, item_id, item_name) VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, 'updated', featureConfig.key, updated.id, updated.name]
      ).catch(() => {});

      res.json({ item: updated });
    } catch (err) {
      console.error(`Error updating ${tableName}:`, err.message);
      res.status(500).json({ error: 'Failed to update item.' });
    }
  });

  // DELETE /:id - Delete item
  router.delete('/:id', authMiddleware, generalLimiter, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const deleted = result.rows[0];

      // Log activity
      await pool.query(
        `INSERT INTO activity_log (user_id, action, feature_key, item_id, item_name) VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, 'deleted', featureConfig.key, deleted.id, deleted.name]
      ).catch(() => {});

      // Clean up favorites and notes for deleted item
      await pool.query(`DELETE FROM favorites WHERE feature_key = $1 AND item_id = $2`, [featureConfig.key, id]).catch(() => {});
      await pool.query(`DELETE FROM notes WHERE feature_key = $1 AND item_id = $2`, [featureConfig.key, id]).catch(() => {});

      res.json({ message: 'Item deleted successfully.', item: deleted });
    } catch (err) {
      console.error(`Error deleting ${tableName}:`, err.message);
      res.status(500).json({ error: 'Failed to delete item.' });
    }
  });

  // POST /:id/generate - AI generation (uses shared aiHelper, Sonnet, aiRateLimiter)
  router.post('/:id/generate', authMiddleware, aiRateLimiter, async (req, res) => {
    try {
      const { id } = req.params;

      // Fetch the item
      const itemResult = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
      if (itemResult.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found.' });
      }

      const item = itemResult.rows[0];
      const prompt = aiPromptTemplate(item);

      // Update status to in-progress
      await pool.query(
        `UPDATE ${tableName} SET status = 'in-progress', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      // Call AI using shared helper (claude-3-5-sonnet-20241022, parseAIJson)
      const systemPrompt = `You are an expert architectural AI assistant. Provide detailed, professional analysis as a JSON object with clearly labeled sections. Return ONLY valid JSON — no markdown fences, no extra text outside the JSON object.`;

      const aiResult = await callOpenRouter(systemPrompt, prompt, 4000);

      // Persist result using the shared saveAiResult pattern
      const updatedResult = await pool.query(
        `UPDATE ${tableName}
         SET ai_result = $1, status = 'completed', updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(aiResult), id]
      );

      // Log activity
      await pool.query(
        `INSERT INTO activity_log (user_id, action, feature_key, item_id, item_name, details) VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, 'ai_generated', featureConfig.key, id, item.name, 'AI analysis completed']
      ).catch(() => {});

      // Persist to central ai_results table
      await pool.query(
        `INSERT INTO ai_results (user_id, feature_key, item_id, item_name, result_data)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [req.user.id, featureConfig.key, id, item.name, JSON.stringify(aiResult)]
      ).catch(() => {});

      res.json({ item: updatedResult.rows[0] });
    } catch (err) {
      console.error(`Error generating AI for ${tableName}:`, err.message);

      // Reset status on error
      const { id } = req.params;
      await pool.query(
        `UPDATE ${tableName} SET status = 'draft', updated_at = NOW() WHERE id = $1`,
        [id]
      ).catch(() => {});

      if (err.response) {
        return res.status(502).json({
          error: 'AI service error.',
          details: err.response.data?.error?.message || err.response.statusText,
        });
      }

      res.status(500).json({ error: 'Failed to generate AI analysis.' });
    }
  });

  // ── Favorites ──────────────────────────────────────────────────
  // GET /:id/favorite - Check if favorited
  router.get('/:id/favorite', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id; // Always from token
      const result = await pool.query(
        `SELECT id FROM favorites WHERE user_id = $1 AND feature_key = $2 AND item_id = $3`,
        [userId, featureConfig.key, id]
      );
      res.json({ favorited: result.rows.length > 0 });
    } catch (err) {
      res.status(500).json({ error: 'Failed to check favorite.' });
    }
  });

  // POST /:id/favorite - Toggle favorite
  router.post('/:id/favorite', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id; // Always from token, never from body

      const existing = await pool.query(
        `SELECT id FROM favorites WHERE user_id = $1 AND feature_key = $2 AND item_id = $3`,
        [userId, featureConfig.key, id]
      );

      if (existing.rows.length > 0) {
        await pool.query(`DELETE FROM favorites WHERE id = $1`, [existing.rows[0].id]);
        res.json({ favorited: false });
      } else {
        await pool.query(
          `INSERT INTO favorites (user_id, feature_key, item_id) VALUES ($1, $2, $3)`,
          [userId, featureConfig.key, id]
        );
        res.json({ favorited: true });
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to toggle favorite.' });
    }
  });

  // ── Notes ─────────────────────────────────────────────────────
  // GET /:id/notes - List notes for an item
  router.get('/:id/notes', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        `SELECT n.*, u.name as user_name FROM notes n LEFT JOIN users u ON u.id = n.user_id WHERE n.feature_key = $1 AND n.item_id = $2 ORDER BY n.created_at DESC`,
        [featureConfig.key, id]
      );
      res.json({ notes: result.rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch notes.' });
    }
  });

  // POST /:id/notes - Add a note
  router.post('/:id/notes', authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id; // Always from token
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: 'Content is required.' });

      const result = await pool.query(
        `INSERT INTO notes (user_id, feature_key, item_id, content) VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, featureConfig.key, id, content.trim()]
      );

      // Get user name
      const userResult = await pool.query(`SELECT name FROM users WHERE id = $1`, [userId]);
      const note = { ...result.rows[0], user_name: userResult.rows[0]?.name || 'Unknown' };

      res.status(201).json({ note });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add note.' });
    }
  });

  // DELETE /notes/:noteId - Delete a note
  router.delete('/notes/:noteId', authMiddleware, async (req, res) => {
    try {
      const { noteId } = req.params;
      // Only allow deletion of own notes
      const result = await pool.query(
        `DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *`,
        [noteId, req.user.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Note not found or not authorized.' });
      res.json({ message: 'Note deleted.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete note.' });
    }
  });

  // ── CSV Export ────────────────────────────────────────────────
  router.get('/export/csv', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
      const items = result.rows;

      if (items.length === 0) {
        return res.status(404).json({ error: 'No items to export.' });
      }

      // Build CSV
      const excludeKeys = ['ai_result', 'data'];
      const flatKeys = Object.keys(items[0]).filter((k) => !excludeKeys.includes(k));
      const dataKeys = items[0].data ? Object.keys(items[0].data) : [];

      const headers = [...flatKeys, ...dataKeys.map((k) => `data_${k}`)];
      const csvRows = [headers.join(',')];

      for (const item of items) {
        const row = flatKeys.map((k) => {
          const val = item[k];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        });
        for (const dk of dataKeys) {
          const val = item.data?.[dk];
          if (val === null || val === undefined) {
            row.push('');
          } else {
            const str = String(val).replace(/"/g, '""');
            row.push(`"${str}"`);
          }
        }
        csvRows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${featureConfig.key}-export.csv"`);
      res.send(csvRows.join('\n'));
    } catch (err) {
      console.error(`Error exporting ${tableName}:`, err.message);
      res.status(500).json({ error: 'Failed to export data.' });
    }
  });

  return router;
}

module.exports = { createFeatureRouter };
