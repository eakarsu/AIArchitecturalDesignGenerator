const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter, parseAIJson } = require('../utils/aiHelper');

const router = express.Router();

// ── Multer setup for floor plan image uploads ──────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `design-${req.params.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.pdf'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and PDF files are allowed.'));
    }
  },
});

// ── Helper: save AI result to a feature table ──────────────────
async function saveAiResult(tableName, itemId, aiResult) {
  await pool.query(
    `UPDATE ${tableName} SET ai_result = $1, status = 'completed', updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(aiResult), itemId]
  );
}

// ── Helper: persist to central ai_results table ─────────────────
async function persistToHistory(userId, featureKey, itemId, itemName, aiResult) {
  await pool.query(
    `INSERT INTO ai_results (user_id, feature_key, item_id, item_name, result_data) VALUES ($1, $2, $3, $4, $5)`,
    [userId, featureKey, itemId, itemName, JSON.stringify(aiResult)]
  ).catch((e) => console.error('ai_results persist error (non-fatal):', e.message));
}

// ── Input validation helpers ───────────────────────────────────
function validateDesignInput({ sq_footage, num_floors, budget }) {
  const errors = [];
  if (sq_footage !== undefined) {
    const sf = Number(sq_footage);
    if (isNaN(sf) || sf < 100 || sf > 50000) errors.push('sq_footage must be between 100 and 50,000.');
  }
  if (num_floors !== undefined) {
    const nf = Number(num_floors);
    if (isNaN(nf) || nf < 1 || nf > 100) errors.push('num_floors must be between 1 and 100.');
  }
  if (budget !== undefined) {
    const b = Number(budget);
    if (isNaN(b) || b <= 0) errors.push('budget must be a positive number.');
  }
  return errors;
}

// ══════════════════════════════════════════════════════════════
// POST /api/ai/generate-design
// ══════════════════════════════════════════════════════════════
router.post('/generate-design', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { project_type, style, requirements, sq_footage, num_floors, budget } = req.body;

    const validationErrors = validateDesignInput({ sq_footage, num_floors, budget });
    if (validationErrors.length) {
      return res.status(400).json({ error: validationErrors.join(' ') });
    }

    if (!project_type || !style) {
      return res.status(400).json({ error: 'project_type and style are required.' });
    }

    const systemPrompt = `You are an expert architectural AI assistant specializing in comprehensive building design.
Provide detailed, professional analysis as valid JSON only — no markdown fences or extra text.`;

    const userPrompt = `Design a ${project_type} building in ${style} style with:
- Square footage: ${sq_footage || 'not specified'} sq ft
- Number of floors: ${num_floors || 'not specified'}
- Budget: $${budget || 'not specified'}
- Special requirements: ${requirements || 'none'}

Return a JSON object with keys:
- floor_plan_description: detailed textual floor plan layout
- room_layouts: array of { room, dimensions, purpose, location }
- material_recommendations: { structural, envelope, interior, roofing }
- sustainability_features: array of sustainable design elements
- design_concept: overall architectural philosophy
- estimated_timeline: construction phases with durations`;

    const aiResult = await callOpenRouter(systemPrompt, userPrompt);

    // Persist to building_designs table
    let savedId = null;
    try {
      const insertResult = await pool.query(
        `INSERT INTO building_designs (name, description, data, ai_result, status, user_id)
         VALUES ($1, $2, $3, $4, 'completed', $5) RETURNING id`,
        [
          `${project_type} - ${style}`,
          requirements || '',
          JSON.stringify({ project_type, style, sq_footage, num_floors, budget }),
          JSON.stringify(aiResult),
          req.user.id,
        ]
      );
      savedId = insertResult.rows[0].id;
      await persistToHistory(req.user.id, 'building-designs', savedId, `${project_type} - ${style}`, aiResult);
    } catch (dbErr) {
      console.error('DB persist error (non-fatal):', dbErr.message);
    }

    res.json({ result: aiResult, saved_id: savedId });
  } catch (err) {
    console.error('generate-design error:', err.message);
    if (err.response) {
      return res.status(502).json({ error: 'AI service error.', details: err.response.data?.error?.message });
    }
    res.status(500).json({ error: err.message || 'Failed to generate design.' });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/ai/space-optimizer
// ══════════════════════════════════════════════════════════════
router.post('/space-optimizer', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { rooms, total_sq_footage, priorities } = req.body;

    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) {
      return res.status(400).json({ error: 'rooms must be a non-empty array.' });
    }
    if (!total_sq_footage) {
      return res.status(400).json({ error: 'total_sq_footage is required.' });
    }

    const systemPrompt = `You are an expert architectural space planner. Optimize room placement for human comfort, traffic flow, natural light, and privacy. Return valid JSON only.`;

    const userPrompt = `Optimize the spatial layout for these rooms in a ${total_sq_footage} sq ft space:
Rooms: ${JSON.stringify(rooms)}
Priorities: ${Array.isArray(priorities) ? priorities.join(', ') : priorities || 'balanced'}

Return a JSON object with keys:
- layout_recommendations: array of { room, placement, reasoning, adjacencies }
- traffic_flow: description of primary circulation paths
- natural_light_strategy: how to maximize natural light per room
- privacy_zones: grouping of rooms by privacy level (public, semi-private, private)
- overall_reasoning: summary of design philosophy`;

    const aiResult = await callOpenRouter(systemPrompt, userPrompt);

    // Persist space optimizer results
    let savedId = null;
    try {
      const insertResult = await pool.query(
        `INSERT INTO floor_plans (name, description, data, ai_result, status, user_id)
         VALUES ($1, $2, $3, $4, 'completed', $5) RETURNING id`,
        [
          `Space Optimization - ${total_sq_footage} sqft`,
          `Space optimizer for ${rooms.length} rooms`,
          JSON.stringify({ rooms, total_sq_footage, priorities }),
          JSON.stringify(aiResult),
          req.user.id,
        ]
      );
      savedId = insertResult.rows[0].id;
      await persistToHistory(req.user.id, 'floor-plans', savedId, `Space Optimization - ${total_sq_footage} sqft`, aiResult);
    } catch (dbErr) {
      console.error('DB persist error (non-fatal):', dbErr.message);
    }

    res.json({ result: aiResult, saved_id: savedId });
  } catch (err) {
    console.error('space-optimizer error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to optimize space.' });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/ai/material-recommender
// ══════════════════════════════════════════════════════════════
router.post('/material-recommender', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { climate, budget_tier, style, sustainability_goal } = req.body;

    if (!climate || !budget_tier || !style) {
      return res.status(400).json({ error: 'climate, budget_tier, and style are required.' });
    }

    const systemPrompt = `You are an expert architectural materials consultant. Provide curated material recommendations with alternatives, cost estimates, and supplier suggestions. Return valid JSON only.`;

    const userPrompt = `Recommend building materials for:
- Climate: ${climate}
- Budget tier: ${budget_tier}
- Architectural style: ${style}
- Sustainability goal: ${sustainability_goal || 'standard'}

Return a JSON object with keys:
- structural_materials: array of { material, primary_choice, alternatives, cost_estimate_per_sqft, pros, cons }
- envelope_materials: array of { category, recommendation, alternative, cost_range, r_value }
- interior_finishes: array of { category, recommendation, alternative, cost_per_sqft }
- roofing: { recommendation, alternative, lifespan_years, cost_per_sqft }
- sustainable_options: array of eco-friendly alternatives with cost premium
- supplier_suggestions: array of { category, suppliers: [], notes }
- total_material_cost_estimate: low-high range per sq ft`;

    const aiResult = await callOpenRouter(systemPrompt, userPrompt);

    // Persist material recommender results
    let savedId = null;
    try {
      const insertResult = await pool.query(
        `INSERT INTO material_estimations (name, description, data, ai_result, status, user_id)
         VALUES ($1, $2, $3, $4, 'completed', $5) RETURNING id`,
        [
          `Materials - ${style} (${climate})`,
          `Material recommendations for ${style} in ${climate} climate`,
          JSON.stringify({ climate, budget_tier, style, sustainability_goal }),
          JSON.stringify(aiResult),
          req.user.id,
        ]
      );
      savedId = insertResult.rows[0].id;
      await persistToHistory(req.user.id, 'material-estimations', savedId, `Materials - ${style} (${climate})`, aiResult);
    } catch (dbErr) {
      console.error('DB persist error (non-fatal):', dbErr.message);
    }

    res.json({ result: aiResult, saved_id: savedId });
  } catch (err) {
    console.error('material-recommender error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate material recommendations.' });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/ai/code-compliance-check
// ══════════════════════════════════════════════════════════════
router.post('/code-compliance-check', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { jurisdiction, occupancy_type, design_features } = req.body;

    if (!jurisdiction || !occupancy_type) {
      return res.status(400).json({ error: 'jurisdiction and occupancy_type are required.' });
    }

    const systemPrompt = `You are an expert building code compliance specialist. Check architectural designs against ADA, IBC, NFPA, and local building codes. Return valid JSON only.`;

    const userPrompt = `Perform a building code compliance check for:
- Jurisdiction: ${jurisdiction}
- Occupancy type: ${occupancy_type}
- Design features: ${Array.isArray(design_features) ? design_features.join(', ') : design_features || 'standard construction'}

Check compliance for:
1. ADA accessibility (ramps, door widths, restroom requirements, parking)
2. Egress requirements (exit capacity, travel distance, exit signs)
3. Fire safety (sprinklers, fire ratings, separation)
4. Structural requirements
5. Plumbing and mechanical codes
6. Energy code (ASHRAE 90.1 or local equivalent)

Return a JSON object with keys:
- ada_accessibility: { status: 'pass'|'fail'|'conditional', items: [{ check, result, notes }] }
- egress: { status, items: [{ check, result, notes }] }
- fire_safety: { status, items: [{ check, result, notes }] }
- structural: { status, items: [{ check, result, notes }] }
- mechanical: { status, items: [{ check, result, notes }] }
- energy_code: { status, items: [{ check, result, notes }] }
- overall_status: 'pass'|'fail'|'conditional'
- recommendations: array of corrective actions required`;

    const aiResult = await callOpenRouter(systemPrompt, userPrompt);

    // Persist to compliance_checks table
    let savedId = null;
    try {
      const insertResult = await pool.query(
        `INSERT INTO compliance_checks (name, description, data, ai_result, status, user_id)
         VALUES ($1, $2, $3, $4, 'completed', $5) RETURNING id`,
        [
          `${occupancy_type} - ${jurisdiction}`,
          `Compliance check for ${occupancy_type} in ${jurisdiction}`,
          JSON.stringify({ jurisdiction, occupancy_type, design_features }),
          JSON.stringify(aiResult),
          req.user.id,
        ]
      );
      savedId = insertResult.rows[0].id;
      await persistToHistory(req.user.id, 'compliance-checks', savedId, `${occupancy_type} - ${jurisdiction}`, aiResult);
    } catch (dbErr) {
      console.error('DB persist error (non-fatal):', dbErr.message);
    }

    res.json({ result: aiResult, saved_id: savedId });
  } catch (err) {
    console.error('code-compliance-check error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to run compliance check.' });
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/ai/cost-estimator
// ══════════════════════════════════════════════════════════════
router.post('/cost-estimator', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { design_id, location, quality_tier } = req.body;

    if (!location || !quality_tier) {
      return res.status(400).json({ error: 'location and quality_tier are required.' });
    }

    // Optionally fetch existing design data
    let designContext = '';
    if (design_id) {
      const designResult = await pool.query('SELECT * FROM building_designs WHERE id = $1', [design_id]);
      if (designResult.rows.length > 0) {
        const d = designResult.rows[0];
        designContext = `\nExisting design context: ${JSON.stringify(d.data)}\nAI design result: ${JSON.stringify(d.ai_result)}`;
      }
    }

    const systemPrompt = `You are an expert construction cost estimator with current market knowledge. Provide detailed, realistic cost breakdowns. Return valid JSON only.`;

    const userPrompt = `Estimate construction costs for:
- Location: ${location}
- Quality tier: ${quality_tier}
${designContext}

Return a JSON object with keys:
- cost_per_sqft: estimated cost per square foot
- total_project_cost: total estimated cost (if sq footage available)
- breakdown: {
    foundation: { cost_per_sqft, percentage, notes },
    framing: { cost_per_sqft, percentage, notes },
    envelope: { cost_per_sqft, percentage, notes },
    mep: { cost_per_sqft, percentage, notes, sub: { mechanical, electrical, plumbing } },
    finishes: { cost_per_sqft, percentage, notes },
    general_conditions: { percentage, notes },
    contingency: { percentage, notes }
  }
- regional_cost_factor: multiplier for the specified location
- timeline_cost_escalation: expected cost increase per month of delay
- value_engineering_opportunities: array of cost reduction suggestions`;

    const aiResult = await callOpenRouter(systemPrompt, userPrompt);

    // Persist to cost_estimations table
    let savedId = null;
    try {
      const insertResult = await pool.query(
        `INSERT INTO cost_estimations (name, description, data, ai_result, status, user_id)
         VALUES ($1, $2, $3, $4, 'completed', $5) RETURNING id`,
        [
          `Cost Estimate - ${location} (${quality_tier})`,
          `Cost estimation for ${quality_tier} quality in ${location}`,
          JSON.stringify({ design_id, location, quality_tier }),
          JSON.stringify(aiResult),
          req.user.id,
        ]
      );
      savedId = insertResult.rows[0].id;
      await persistToHistory(req.user.id, 'cost-estimations', savedId, `Cost Estimate - ${location} (${quality_tier})`, aiResult);
    } catch (dbErr) {
      console.error('DB persist error (non-fatal):', dbErr.message);
    }

    res.json({ result: aiResult, saved_id: savedId });
  } catch (err) {
    console.error('cost-estimator error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to estimate cost.' });
  }
});

// ══════════════════════════════════════════════════════════════
// GET /api/ai/stream-design?projectId=X
// SSE: streams design generation step by step (rate-limited)
// ══════════════════════════════════════════════════════════════
router.get('/stream-design', authMiddleware, aiRateLimiter, async (req, res) => {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ error: 'projectId query param is required.' });
  }

  // Fetch the project record
  let project;
  try {
    const result = await pool.query('SELECT * FROM building_designs WHERE id = $1', [projectId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    project = result.rows[0];
  } catch (err) {
    return res.status(500).json({ error: 'Database error.' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your-openrouter-api-key-here') {
    return res.status(400).json({ error: 'OpenRouter API key is not configured.' });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (eventType, data) => {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const steps = [
    'Analyzing project requirements...',
    'Generating floor plan layout...',
    'Optimizing room configurations...',
    'Selecting materials and systems...',
    'Calculating sustainability metrics...',
    'Finalizing design recommendations...',
  ];

  try {
    // Stream step-by-step progress
    for (let i = 0; i < steps.length; i++) {
      sendEvent('progress', { step: i + 1, total: steps.length, message: steps[i] });
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    // Make the actual AI call using shared helper
    const d = project.data || {};
    const aiResult = await callOpenRouter(
      'You are an expert architectural AI assistant. Return valid JSON only — no markdown fences, no extra text.',
      `Generate a detailed architectural design for project: ${project.name}
Building type: ${d.building_type || 'not specified'}
Area: ${d.area_sqft || 'not specified'} sq ft
Stories: ${d.stories || 'not specified'}
Style: ${d.style || 'not specified'}
Budget: ${d.budget || 'not specified'}

Return JSON with: concept, spacePlanning, exteriorDesign, structuralSystem, materials, sustainability, timeline`,
      4000
    );

    // Save result to DB
    await saveAiResult('building_designs', projectId, aiResult);
    await persistToHistory(req.user.id, 'building-designs', parseInt(projectId), project.name, aiResult);

    sendEvent('complete', { result: aiResult });
    res.end();
  } catch (err) {
    sendEvent('error', { message: err.message || 'AI generation failed.' });
    res.end();
  }
});

// ══════════════════════════════════════════════════════════════
// POST /api/designs/:id/upload
// File upload for floor plan images
// ══════════════════════════════════════════════════════════════
router.post('/designs/:id/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { id } = req.params;
    const fileUrl = `/uploads/${req.file.filename}`;

    // Attach the file URL to the design's data JSONB
    try {
      await pool.query(
        `UPDATE building_designs
         SET data = jsonb_set(COALESCE(data, '{}'), '{uploaded_file}', $1::jsonb, true),
             updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(fileUrl), id]
      );
    } catch (dbErr) {
      console.error('DB update error (non-fatal):', dbErr.message);
    }

    res.json({
      message: 'File uploaded successfully.',
      file_url: fileUrl,
      filename: req.file.filename,
      size: req.file.size,
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ error: err.message || 'File upload failed.' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
