const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
let ipKeyGenerator;
try { ({ ipKeyGenerator } = require('express-rate-limit')); } catch (_) { ipKeyGenerator = (ip) => ip; }
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// AI rate limiter (20 / hour / user) — matches main pattern, IPv6-safe
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    if (req.user?.id) return `user:${req.user.id}`;
    return typeof ipKeyGenerator === 'function' ? ipKeyGenerator(req.ip) : req.ip;
  },
  message: { error: 'Too many AI requests. Limit is 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3-strategy parser
function parseAIJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (_) {}
  const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try { return JSON.parse(cleaned); } catch (_) {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return { rawResponse: text };
}

async function callOpenRouter(systemPrompt, userPrompt, maxTokens = 3000) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your-openrouter-api-key-here') {
    throw new Error('OpenRouter API key not configured. Set OPENROUTER_API_KEY in .env');
  }
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: process.env.AI_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Architectural Design Generator',
      },
      timeout: 60000,
    }
  );
  return parseAIJson(response.data.choices?.[0]?.message?.content || '');
}

// Ensure auxiliary tables exist (idempotent)
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS architecture_templates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      template_type VARCHAR(100) NOT NULL,
      dimensions JSONB,
      ai_results JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS accessibility_audits (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      design_id INTEGER,
      score INTEGER,
      ai_results JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS design_comments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      design_id INTEGER NOT NULL,
      author VARCHAR(255),
      comment_text TEXT NOT NULL,
      ai_grouping JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS color_palettes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      room_type VARCHAR(100),
      mood VARCHAR(100),
      ai_results JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS lighting_simulations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ai_results JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS furniture_arrangements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      room_dimensions JSONB,
      ai_results JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

// 1. Architecture Template Library
router.post('/template', authMiddleware, aiLimiter, async (req, res) => {
  try {
    await ensureTables();
    const { template_type, dimensions, materials } = req.body;
    if (!template_type) return res.status(400).json({ error: 'template_type is required' });
    const sys = `You are an architect generating reusable room/building templates. Return JSON only.`;
    const user = `Generate a template for: ${template_type}
Dimensions: ${JSON.stringify(dimensions || {})}
Preferred materials: ${JSON.stringify(materials || [])}

Return JSON: {
  "template_name": "...",
  "rooms": [{ "name": "...", "dimensions": "...", "purpose": "..." }],
  "furniture_placement": [{ "item": "...", "location": "...", "rationale": "..." }],
  "material_recommendations": ["..."],
  "estimated_sqft": <int>,
  "customization_options": ["..."]
}`;
    const result = await callOpenRouter(sys, user);
    const ins = await pool.query(
      `INSERT INTO architecture_templates (user_id, template_type, dimensions, ai_results) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, template_type, JSON.stringify(dimensions || {}), JSON.stringify(result)]
    );
    res.json({ result, saved: ins.rows[0] });
  } catch (e) {
    console.error('template error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/template', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const total = await pool.query('SELECT COUNT(*) FROM architecture_templates WHERE user_id = $1', [req.user.id]);
    const rows = await pool.query(
      'SELECT * FROM architecture_templates WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    res.json({ data: rows.rows, pagination: { page, limit, total: parseInt(total.rows[0].count), totalPages: Math.ceil(total.rows[0].count / limit) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 2. Accessibility Audit (ADA/WCAG)
router.post('/accessibility-audit', authMiddleware, aiLimiter, async (req, res) => {
  try {
    await ensureTables();
    const { design_id, design_features, occupancy_type } = req.body;
    let designContext = '';
    if (design_id) {
      const r = await pool.query('SELECT * FROM building_designs WHERE id = $1', [design_id]);
      if (r.rows.length) designContext = JSON.stringify({ data: r.rows[0].data, ai_result: r.rows[0].ai_result });
    }
    const sys = `You are an accessibility auditor (ADA + WCAG-aligned). Return JSON only.`;
    const user = `Audit this design for ADA accessibility (and any digital wayfinding for WCAG):
Occupancy: ${occupancy_type || 'commercial'}
Design context: ${designContext || JSON.stringify(design_features || {})}

Return JSON: {
  "overall_score": 0-100,
  "checks": [
    { "code": "ADA-404", "category": "doors", "status": "pass|fail|conditional", "issue": "...", "fix": "..." }
  ],
  "high_priority_issues": ["..."],
  "compliance_summary": { "ada": "pass|fail|conditional", "wcag": "n/a|pass|fail" },
  "recommendations": ["..."]
}`;
    const result = await callOpenRouter(sys, user);
    const ins = await pool.query(
      `INSERT INTO accessibility_audits (user_id, design_id, score, ai_results) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, design_id || null, result?.overall_score || null, JSON.stringify(result)]
    );
    res.json({ result, saved: ins.rows[0] });
  } catch (e) {
    console.error('accessibility-audit error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/accessibility-audit', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const total = await pool.query('SELECT COUNT(*) FROM accessibility_audits WHERE user_id = $1', [req.user.id]);
    const rows = await pool.query(
      'SELECT * FROM accessibility_audits WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    res.json({ data: rows.rows, pagination: { page, limit, total: parseInt(total.rows[0].count), totalPages: Math.ceil(total.rows[0].count / limit) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Collaborative Markup Tool
router.post('/comments', authMiddleware, async (req, res) => {
  try {
    await ensureTables();
    const { design_id, author, comment_text } = req.body;
    if (!design_id || !comment_text) {
      return res.status(400).json({ error: 'design_id and comment_text are required' });
    }
    const ins = await pool.query(
      `INSERT INTO design_comments (user_id, design_id, author, comment_text) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, design_id, author || req.user.name || req.user.email, comment_text]
    );
    res.status(201).json({ comment: ins.rows[0] });
  } catch (e) {
    console.error('comments error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/comments/:designId', authMiddleware, async (req, res) => {
  try {
    await ensureTables();
    const r = await pool.query(
      `SELECT * FROM design_comments WHERE design_id = $1 ORDER BY created_at ASC`,
      [req.params.designId]
    );
    res.json({ comments: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/comments/:designId/synthesize', authMiddleware, aiLimiter, async (req, res) => {
  try {
    await ensureTables();
    const { designId } = req.params;
    const r = await pool.query('SELECT * FROM design_comments WHERE design_id = $1 ORDER BY created_at ASC', [designId]);
    if (r.rows.length === 0) return res.json({ result: { groups: [], summary: 'No comments yet.' } });
    const sys = `You synthesise architectural design feedback. Group by theme, prioritise. Return JSON only.`;
    const user = `Comments: ${JSON.stringify(r.rows.map((c) => ({ author: c.author, text: c.comment_text })))}

Return JSON: {
  "groups": [{ "theme": "structural|aesthetic|safety|cost|other", "items": ["..."], "priority": "high|medium|low" }],
  "consensus": "...",
  "outstanding_disagreements": ["..."],
  "summary": "..."
}`;
    const result = await callOpenRouter(sys, user);
    // Persist grouping into latest comment row
    await pool.query(
      `UPDATE design_comments SET ai_grouping = $1 WHERE design_id = $2`,
      [JSON.stringify(result), designId]
    );
    res.json({ result });
  } catch (e) {
    console.error('synthesize error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// 4. Interior Color Harmony Suggester
router.post('/color-harmony', authMiddleware, aiLimiter, async (req, res) => {
  try {
    await ensureTables();
    const { room_type, mood, base_colors, style } = req.body;
    if (!room_type) return res.status(400).json({ error: 'room_type is required' });
    const sys = `You are an interior colour theorist. Return JSON only with palettes.`;
    const user = `Suggest complementary palettes:
Room type: ${room_type}
Mood: ${mood || 'calm-modern'}
Style: ${style || 'contemporary'}
Base colors (optional): ${JSON.stringify(base_colors || [])}

Return JSON: {
  "palettes": [
    { "name": "...", "colors": [{ "name": "...", "hex": "#xxxxxx", "rgb": "rgb(r,g,b)", "usage": "wall|trim|accent|floor|ceiling" }], "vibe": "..." }
  ],
  "reasoning": "...",
  "do_not_use": [{ "hex": "#xxxxxx", "reason": "..." }]
}`;
    const result = await callOpenRouter(sys, user);
    const ins = await pool.query(
      `INSERT INTO color_palettes (user_id, room_type, mood, ai_results) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, room_type, mood || null, JSON.stringify(result)]
    );
    res.json({ result, saved: ins.rows[0] });
  } catch (e) {
    console.error('color-harmony error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/color-harmony', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const total = await pool.query('SELECT COUNT(*) FROM color_palettes WHERE user_id = $1', [req.user.id]);
    const rows = await pool.query(
      'SELECT * FROM color_palettes WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    res.json({ data: rows.rows, pagination: { page, limit, total: parseInt(total.rows[0].count), totalPages: Math.ceil(total.rows[0].count / limit) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. Lighting Simulation Engine
router.post('/lighting-simulation', authMiddleware, aiLimiter, async (req, res) => {
  try {
    await ensureTables();
    const { room_dimensions, window_sizes, orientation, latitude, season } = req.body;
    if (!room_dimensions) return res.status(400).json({ error: 'room_dimensions required' });
    const sys = `You simulate natural & artificial lighting for indoor spaces. Approximate using physics rules-of-thumb. Return JSON only.`;
    const user = `Room: ${JSON.stringify(room_dimensions)}
Windows: ${JSON.stringify(window_sizes || [])}
Orientation: ${orientation || 'south'}
Latitude: ${latitude || 35}
Season: ${season || 'summer'}

Return JSON: {
  "natural_light_by_hour": [{ "hour": 6, "lux": <int>, "qualitative": "low|medium|high" }],
  "daylight_factor_pct": <number>,
  "artificial_lighting_recommendations": [{ "fixture": "...", "lumens": <int>, "color_temp_k": <int>, "placement": "...", "qty": <int> }],
  "energy_estimate_w": <int>,
  "design_notes": "..."
}`;
    const result = await callOpenRouter(sys, user);
    const ins = await pool.query(
      `INSERT INTO lighting_simulations (user_id, ai_results) VALUES ($1, $2) RETURNING *`,
      [req.user.id, JSON.stringify(result)]
    );
    res.json({ result, saved: ins.rows[0] });
  } catch (e) {
    console.error('lighting-simulation error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/lighting-simulation', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const total = await pool.query('SELECT COUNT(*) FROM lighting_simulations WHERE user_id = $1', [req.user.id]);
    const rows = await pool.query(
      'SELECT * FROM lighting_simulations WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    res.json({ data: rows.rows, pagination: { page, limit, total: parseInt(total.rows[0].count), totalPages: Math.ceil(total.rows[0].count / limit) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 6. Furniture Arrangement Optimizer
router.post('/furniture-arrangement', authMiddleware, aiLimiter, async (req, res) => {
  try {
    await ensureTables();
    const { room_dimensions, furniture, preferences } = req.body;
    if (!room_dimensions || !Array.isArray(furniture) || furniture.length === 0) {
      return res.status(400).json({ error: 'room_dimensions and non-empty furniture[] required' });
    }
    const sys = `You optimise furniture layouts for traffic flow, sight lines, and function. Return JSON only.`;
    const user = `Room: ${JSON.stringify(room_dimensions)}
Furniture: ${JSON.stringify(furniture)}
Preferences: ${JSON.stringify(preferences || {})}

Return JSON: {
  "layouts": [
    {
      "name": "...",
      "description": "...",
      "placements": [{ "item": "...", "x_ft": <number>, "y_ft": <number>, "rotation_deg": <number> }],
      "score": 0-100,
      "pros": ["..."], "cons": ["..."]
    }
  ],
  "recommended_layout_index": <int>,
  "traffic_flow_notes": "..."
}`;
    const result = await callOpenRouter(sys, user);
    const ins = await pool.query(
      `INSERT INTO furniture_arrangements (user_id, room_dimensions, ai_results) VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, JSON.stringify(room_dimensions), JSON.stringify(result)]
    );
    res.json({ result, saved: ins.rows[0] });
  } catch (e) {
    console.error('furniture-arrangement error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.get('/furniture-arrangement', authMiddleware, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const total = await pool.query('SELECT COUNT(*) FROM furniture_arrangements WHERE user_id = $1', [req.user.id]);
    const rows = await pool.query(
      'SELECT * FROM furniture_arrangements WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [req.user.id, limit, offset]
    );
    res.json({ data: rows.rows, pagination: { page, limit, total: parseInt(total.rows[0].count), totalPages: Math.ceil(total.rows[0].count / limit) } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
