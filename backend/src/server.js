const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { pool, initDatabase, featureTables } = require('./config/database');
const features = require('./config/features');
const authRoutes = require('./routes/auth');
const { createFeatureRouter } = require('./routes/features');
const aiRoutes = require('./routes/ai');
const aiExtrasRoutes = require('./routes/aiExtras');
const aiBacklogRoutes = require('./routes/aiBacklog');
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('./middleware/auth');
const { generalLimiter, aiRateLimiter } = require('./middleware/rateLimiter');
const { callOpenRouter } = require('./utils/aiHelper');

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT, 10) || 3001;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Let clients manage their own CSP
}));

// CORS — env-driven origin list (defaults to CLIENT_URL)
const clientUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || '';
const corsOrigins = clientUrl
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const corsOptions = corsOrigins.length > 0
  ? {
      origin: (origin, cb) => {
        if (!origin || corsOrigins.includes(origin) || corsOrigins.includes('*')) {
          return cb(null, true);
        }
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }
  : { origin: true, credentials: true };

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Global rate limiter (100 req / 15 min per IP/user)
app.use('/api/', generalLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes
app.use('/api/auth', authRoutes);

// AI routes (includes /api/ai/* endpoints and /api/ai/designs/:id/upload)
app.use('/api/ai', aiRoutes);

// AI Extras routes (template, accessibility, comments, color, lighting, furniture)
app.use('/api/ai-extras', aiExtrasRoutes);

// AI Backlog routes (apply pass 5 — precedent search, BIM, render-spec, structural-advisor,
// energy-model, plugin-export, material-library, cad-conversion, design versions, comments+lock)
app.use('/api/ai', aiBacklogRoutes);

// Feature routes
for (const [key, config] of Object.entries(features)) {
  app.use(`/api/${key}`, createFeatureRouter(config));
}

// Features metadata endpoint
app.get('/api/features', (req, res) => {
  const featureList = Object.values(features).map(({ key, name, description, icon, fields, tableName }) => ({
    key,
    name,
    description,
    icon,
    fields,
    tableName,
  }));
  res.json({ features: featureList });
});

// ── Global Cross-Feature Search ─────────────────────────────────
app.get('/api/search', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters.' });
    }
    const requestedFeatures = req.query.features
      ? req.query.features.split(',').map((s) => s.trim()).filter(Boolean)
      : null;

    const results = {};
    const searchParam = `%${q}%`;

    for (const [key, config] of Object.entries(features)) {
      if (requestedFeatures && !requestedFeatures.includes(key)) continue;
      try {
        const rows = await pool.query(
          `SELECT id, name, description, status, created_at, updated_at FROM ${config.tableName}
           WHERE name ILIKE $1 OR description ILIKE $1
           ORDER BY updated_at DESC LIMIT 10`,
          [searchParam]
        );
        if (rows.rows.length > 0) {
          results[key] = {
            feature_name: config.name,
            feature_key: key,
            count: rows.rows.length,
            items: rows.rows,
          };
        }
      } catch (_) { /* table may not exist yet */ }
    }

    const totalCount = Object.values(results).reduce((s, r) => s + r.count, 0);
    res.json({ query: q, total: totalCount, results });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Search failed.' });
  }
});

// ── AI History (central ai_results table) ──────────────────────
app.get('/api/ai-history', authMiddleware, generalLimiter, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;
    const featureFilter = req.query.feature_key || '';

    let query = `SELECT * FROM ai_results WHERE user_id = $1`;
    let countQuery = `SELECT COUNT(*) FROM ai_results WHERE user_id = $1`;
    const params = [req.user.id];
    const countParams = [req.user.id];

    if (featureFilter) {
      params.push(featureFilter);
      countParams.push(featureFilter);
      query += ` AND feature_key = $${params.length}`;
      countQuery += ` AND feature_key = $${countParams.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('AI history error:', err.message);
    res.status(500).json({ error: 'Failed to load AI history.' });
  }
});

// ── Batch AI Generate ───────────────────────────────────────────
app.post('/api/:featureKey/batch-generate', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { featureKey } = req.params;
    const featureConfig = features[featureKey];
    if (!featureConfig) {
      return res.status(404).json({ error: 'Feature not found.' });
    }

    const { item_ids } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ error: 'item_ids must be a non-empty array.' });
    }
    if (item_ids.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 items per batch.' });
    }

    const results = { succeeded: [], failed: [] };

    for (const rawId of item_ids) {
      const id = parseInt(rawId, 10);
      if (isNaN(id)) {
        results.failed.push({ id: rawId, error: 'Invalid ID.' });
        continue;
      }
      try {
        const itemResult = await pool.query(
          `SELECT * FROM ${featureConfig.tableName} WHERE id = $1`, [id]
        );
        if (itemResult.rows.length === 0) {
          results.failed.push({ id, error: 'Not found.' });
          continue;
        }
        const item = itemResult.rows[0];
        const prompt = featureConfig.aiPromptTemplate(item);
        const systemPrompt = `You are an expert architectural AI assistant. Return ONLY valid JSON — no markdown fences, no extra text outside the JSON.`;

        await pool.query(
          `UPDATE ${featureConfig.tableName} SET status = 'in-progress', updated_at = NOW() WHERE id = $1`, [id]
        );

        const aiResult = await callOpenRouter(systemPrompt, prompt, 4000);

        await pool.query(
          `UPDATE ${featureConfig.tableName} SET ai_result = $1, status = 'completed', updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(aiResult), id]
        );

        // Log to ai_results
        await pool.query(
          `INSERT INTO ai_results (user_id, feature_key, item_id, item_name, result_data) VALUES ($1, $2, $3, $4, $5)`,
          [req.user.id, featureKey, id, item.name, JSON.stringify(aiResult)]
        ).catch(() => {});

        await pool.query(
          `INSERT INTO activity_log (user_id, action, feature_key, item_id, item_name, details) VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.user.id, 'ai_generated', featureKey, id, item.name, 'batch AI analysis']
        ).catch(() => {});

        results.succeeded.push({ id, name: item.name });
      } catch (e) {
        await pool.query(
          `UPDATE ${featureConfig.tableName} SET status = 'draft', updated_at = NOW() WHERE id = $1`, [rawId]
        ).catch(() => {});
        results.failed.push({ id, error: e.message });
      }
    }

    res.json({
      message: `Batch complete. ${results.succeeded.length} succeeded, ${results.failed.length} failed.`,
      results,
    });
  } catch (err) {
    console.error('Batch generate error:', err.message);
    res.status(500).json({ error: 'Batch generation failed.' });
  }
});

// ── AI Design Comparison ────────────────────────────────────────
app.post('/api/ai/compare-designs', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { design_id_a, design_id_b } = req.body;
    if (!design_id_a || !design_id_b) {
      return res.status(400).json({ error: 'design_id_a and design_id_b are required.' });
    }

    const [resA, resB] = await Promise.all([
      pool.query('SELECT * FROM building_designs WHERE id = $1', [design_id_a]),
      pool.query('SELECT * FROM building_designs WHERE id = $1', [design_id_b]),
    ]);

    if (resA.rows.length === 0) return res.status(404).json({ error: `Design ${design_id_a} not found.` });
    if (resB.rows.length === 0) return res.status(404).json({ error: `Design ${design_id_b} not found.` });

    const [dA, dB] = [resA.rows[0], resB.rows[0]];

    const systemPrompt = `You are an expert architectural consultant. Compare two building designs objectively. Return ONLY valid JSON.`;
    const userPrompt = `Compare these two architectural designs:

DESIGN A: "${dA.name}"
Data: ${JSON.stringify(dA.data)}
AI Result: ${JSON.stringify(dA.ai_result)}

DESIGN B: "${dB.name}"
Data: ${JSON.stringify(dB.data)}
AI Result: ${JSON.stringify(dB.ai_result)}

Return JSON:
{
  "design_a_strengths": ["..."],
  "design_a_weaknesses": ["..."],
  "design_b_strengths": ["..."],
  "design_b_weaknesses": ["..."],
  "cost_comparison": { "assessment": "...", "advantage": "A|B|equal" },
  "sustainability_comparison": { "assessment": "...", "advantage": "A|B|equal" },
  "overall_recommendation": { "winner": "A|B|tie", "reasoning": "...", "best_use_case": "..." },
  "key_differences": ["..."],
  "similarity_score": 0-100
}`;

    const aiResult = await callOpenRouter(systemPrompt, userPrompt, 3000);

    res.json({
      design_a: { id: dA.id, name: dA.name },
      design_b: { id: dB.id, name: dB.name },
      comparison: aiResult,
    });
  } catch (err) {
    console.error('Compare designs error:', err.message);
    res.status(500).json({ error: err.message || 'Comparison failed.' });
  }
});

// ── Analytics endpoint ──────────────────────────────────────────
app.get('/api/analytics', authMiddleware, async (req, res) => {
  try {
    const statusCounts = {};
    const recentItems = [];

    for (const [key, config] of Object.entries(features)) {
      const statusResult = await pool.query(
        `SELECT status, COUNT(*) as count FROM ${config.tableName} GROUP BY status`
      );
      statusCounts[key] = {};
      for (const row of statusResult.rows) {
        statusCounts[key][row.status] = parseInt(row.count, 10);
      }

      const recentResult = await pool.query(
        `SELECT id, name, status, created_at, updated_at FROM ${config.tableName} ORDER BY updated_at DESC LIMIT 3`
      );
      for (const row of recentResult.rows) {
        recentItems.push({ ...row, feature_key: key, feature_name: config.name });
      }
    }

    // Sort recent items by updated_at and take top 10
    recentItems.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const topRecent = recentItems.slice(0, 10);

    // Totals
    let totalDraft = 0, totalInProgress = 0, totalCompleted = 0, totalItems = 0;
    for (const counts of Object.values(statusCounts)) {
      totalDraft += counts.draft || 0;
      totalInProgress += counts['in-progress'] || 0;
      totalCompleted += counts.completed || 0;
      totalItems += Object.values(counts).reduce((s, c) => s + c, 0);
    }

    res.json({
      statusCounts,
      recentItems: topRecent,
      totals: { totalItems, totalDraft, totalInProgress, totalCompleted },
    });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: 'Failed to load analytics.' });
  }
});

// ── Activity log endpoint ──────────────────────────────────────
app.get('/api/activity', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const result = await pool.query(
      `SELECT a.*, u.name as user_name FROM activity_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ activities: result.rows });
  } catch (err) {
    console.error('Activity log error:', err.message);
    res.status(500).json({ error: 'Failed to load activity log.' });
  }
});

// ── User favorites list ────────────────────────────────────────
app.get('/api/favorites', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT * FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json({ favorites: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load favorites.' });
  }
});

// ── Profile update ─────────────────────────────────────────────
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    const result = await pool.query(
      `UPDATE users SET name = $1 WHERE id = $2 RETURNING id, email, name, created_at`,
      [name.trim(), req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ── Change password ────────────────────────────────────────────
app.put('/api/auth/password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Password change error:', err.message);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

// === Custom Views (Design Views) — must be before 404 handler ===
app.use('/api/custom-views', require('./routes/customViews'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start server ────────────────────────────────────────────────
let server;

async function start() {
  try {
    await initDatabase();
    console.log('Database initialized successfully');

    server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Features loaded: ${Object.keys(features).join(', ')}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

// ── Graceful shutdown ───────────────────────────────────────────
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await pool.end();
        console.log('Database pool closed.');
      } catch (_) {}
      process.exit(0);
    });
    // Force exit after 10s
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start();

// BATCH_00_AUDIT_MOUNTS
app.use('/api/design-to-cad', require('./routes/designToCad'));
app.use('/api/bim-generation', require('./routes/bimGeneration'));
app.use('/api/energy-modeling', require('./routes/energyModeling'));
app.use('/api/material-library', require('./routes/materialLibrary'));
app.use('/api/cad-plugin-bridge', require('./routes/cadPluginBridge'));

// === Batch 00 Gaps & Frontend Mounts ===
app.use('/api/gap-ai-precedent-project-search-similar', require('./routes/gap_ai_precedent_project_search_similar'));
app.use('/api/gap-ai-design-bim-conversion-2d', require('./routes/gap_ai_design_bim_conversion_2d'));
app.use('/api/gap-ai-structural-feasibility-checker', require('./routes/gap_ai_structural_feasibility_checker'));
app.use('/api/gap-ai-energy-modeling-pipeline', require('./routes/gap_ai_energy_modeling_pipeline'));
app.use('/api/gap-multi-user-collaborative-design-editing', require('./routes/gap_multi_user_collaborative_design_editing'));
app.use('/api/gap-design-version-control-branching', require('./routes/gap_design_version_control_branching'));
app.use('/api/gap-native-rendering-visualization-pipeline', require('./routes/gap_native_rendering_visualization_pipeline'));
app.use('/api/gap-structural-analysis-hooks', require('./routes/gap_structural_analysis_hooks'));
app.use('/api/gap-outbound-webhooks', require('./routes/gap_outbound_webhooks'));
