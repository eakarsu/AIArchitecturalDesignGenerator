// Apply pass 5 — backlog endpoints (AIArchitecturalDesignGenerator)
//
// All endpoints additive. Heavy infra (vector DB, render engine, FEA, BIM
// pipeline, real-time CRDT) replaced with AI/in-memory stubs per scope.
//
// ENV vars referenced:
//   OPENROUTER_API_KEY  — required for AI endpoints; missing -> 503 missing: OPENROUTER_API_KEY
//   AI_MODEL            — optional model override (default claude-3-5-sonnet)
//
// PRODUCT-DECISION items (documented per endpoint):
//   - Version control: snapshot whole `building_designs.data + ai_result`
//     into `design_versions` table, no diff/merge engine.
//   - Energy modeling: climate inputs supplied by caller (HDD/CDD,
//     latitude, sun-hours, fuel mix). No external climate-data fetch.
//
// TOO-RISKY items reduced to safe stubs (in-memory or AI-driven JSON):
//   - Precedent search: in-memory keyword similarity over user's past
//     `building_designs` rows (no embeddings).
//   - Design-to-BIM: AI-generated structured BIM JSON descriptor.
//   - Render-spec: AI-generated rendering spec (camera/lighting/materials).
//   - Structural analysis: AI-driven advisor; explicitly NOT a certified FEA.
//   - Plugin export: format-specific JSON descriptors (Revit/AutoCAD/SketchUp)
//     + an explicit `disclaimer` field. No binary format generation.
//   - Collaboration: persistent comment threads + soft-lock claim/release in
//     `design_collab_locks` and `design_comments` tables (no realtime CRDT).

const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const { callOpenRouter } = require('../utils/aiHelper');

const router = express.Router();

// ── 503 guard ──────────────────────────────────────────────────
function aiConfigured() {
  const k = process.env.OPENROUTER_API_KEY;
  return !!(k && k !== 'your-openrouter-api-key-here');
}
function need503(res) {
  if (!aiConfigured()) {
    res.status(503).json({
      error: 'AI not configured',
      missing: 'OPENROUTER_API_KEY',
    });
    return true;
  }
  return false;
}

// ── Idempotent backlog tables ──────────────────────────────────
let _initialized = false;
async function initBacklogTables() {
  if (_initialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS design_versions (
      id SERIAL PRIMARY KEY,
      design_id INTEGER NOT NULL,
      user_id INTEGER,
      label VARCHAR(255),
      snapshot JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_design_versions_design_id ON design_versions(design_id);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS design_comments (
      id SERIAL PRIMARY KEY,
      design_id INTEGER NOT NULL,
      user_id INTEGER,
      author_name VARCHAR(255),
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_design_comments_design_id ON design_comments(design_id);`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS design_collab_locks (
      design_id INTEGER PRIMARY KEY,
      user_id INTEGER,
      locked_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS material_library_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(120),
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  _initialized = true;
}
initBacklogTables().catch((e) => console.error('aiBacklog init tables error (non-fatal):', e.message));

async function persistAi(userId, featureKey, itemId, itemName, result) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, feature_key, item_id, item_name, result_data) VALUES ($1, $2, $3, $4, $5)`,
      [userId, featureKey, itemId, itemName, JSON.stringify(result)]
    );
  } catch (_) { /* table may not exist yet in tests */ }
}

// ══════════════════════════════════════════════════════════════
// 1. POST /api/ai/precedent-search  (in-memory keyword similarity)
// ══════════════════════════════════════════════════════════════
// PRODUCT-DECISION: Vector DB / embeddings out-of-scope. Use lowercase
// token-overlap Jaccard similarity over the user's past `building_designs`
// rows. Returns top-N similar precedents with score + a reasoning blurb.
router.post('/precedent-search', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { query, top_n } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) is required.' });
    }
    const N = Math.max(1, Math.min(parseInt(top_n, 10) || 5, 20));
    const tokenize = (s) => new Set(
      String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((t) => t.length > 2)
    );
    const qTokens = tokenize(query);
    const rows = await pool.query(
      `SELECT id, name, description, data, ai_result FROM building_designs WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 500`,
      [req.user.id]
    );
    const scored = rows.rows.map((r) => {
      const docTokens = tokenize([r.name, r.description, JSON.stringify(r.data || {}), JSON.stringify(r.ai_result || {})].join(' '));
      let inter = 0;
      qTokens.forEach((t) => { if (docTokens.has(t)) inter++; });
      const union = new Set([...qTokens, ...docTokens]).size || 1;
      const jaccard = inter / union;
      return { id: r.id, name: r.name, description: r.description, score: Math.round(jaccard * 1000) / 1000 };
    }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, N);

    res.json({
      method: 'token-overlap-jaccard',
      query,
      total_searched: rows.rows.length,
      results: scored,
      note: 'In-memory keyword similarity (no embeddings/vector DB).',
    });
  } catch (err) {
    console.error('precedent-search error:', err.message);
    res.status(500).json({ error: err.message || 'precedent-search failed.' });
  }
});

// ══════════════════════════════════════════════════════════════
// 2. POST /api/ai/design-to-bim  (AI-generated BIM JSON descriptor)
// ══════════════════════════════════════════════════════════════
router.post('/design-to-bim', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    if (need503(res)) return;
    const { design_id, design_summary } = req.body || {};
    if (!design_id && !design_summary) {
      return res.status(400).json({ error: 'design_id or design_summary is required.' });
    }
    let summary = design_summary;
    if (!summary && design_id) {
      const r = await pool.query('SELECT name, description, data, ai_result FROM building_designs WHERE id = $1 AND user_id = $2', [design_id, req.user.id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Design not found.' });
      summary = JSON.stringify(r.rows[0]);
    }
    const sys = `You are a BIM modeler. Return ONLY valid JSON for a hierarchical BIM descriptor. This is a JSON descriptor, not an IFC file.`;
    const user = `Convert this 2D design summary into a structured BIM JSON descriptor.

Design: ${summary}

Return JSON:
{
  "schema": "bim-descriptor-v1",
  "stories": [{ "level": 0, "elevation_m": 0, "spaces": [{ "id": "...", "name": "...", "polygon_2d": [[x,y],...], "ceiling_height_m": 0 }] }],
  "walls": [{ "id": "...", "from": [x,y,z], "to": [x,y,z], "thickness_m": 0, "type": "interior|exterior|partition" }],
  "openings": [{ "id": "...", "wall_id": "...", "type": "door|window", "width_m": 0, "height_m": 0 }],
  "structure": { "system": "...", "columns": [...], "beams": [...] },
  "mep_zones": ["..."],
  "notes": "..."
}`;
    const result = await callOpenRouter(sys, user, 4000);
    await persistAi(req.user.id, 'design-to-bim', design_id || null, 'BIM descriptor', result);
    res.json({ result, disclaimer: 'JSON BIM descriptor — not a certified IFC/Revit file.' });
  } catch (err) {
    console.error('design-to-bim error:', err.message);
    res.status(500).json({ error: err.message || 'design-to-bim failed.' });
  }
});

// ══════════════════════════════════════════════════════════════
// 3. Multi-user collaboration: comments + soft-lock
// ══════════════════════════════════════════════════════════════
// PRODUCT-DECISION: No realtime CRDT/OT. Use lock claim/release with
// 30-minute TTL + persistent comment thread.

router.get('/designs/:id/comments', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });
    const rows = await pool.query('SELECT * FROM design_comments WHERE design_id = $1 ORDER BY created_at ASC', [id]);
    res.json({ comments: rows.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/designs/:id/comments', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { body } = req.body || {};
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });
    if (!body || !String(body).trim()) return res.status(400).json({ error: 'body is required.' });
    const ins = await pool.query(
      `INSERT INTO design_comments (design_id, user_id, author_name, body) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.user.id, req.user.name || req.user.email || null, String(body).trim()]
    );
    res.json({ comment: ins.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/designs/:id/lock/claim', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });
    const now = await pool.query('SELECT NOW() AS now');
    // 30 minute TTL
    const existing = await pool.query('SELECT * FROM design_collab_locks WHERE design_id = $1', [id]);
    if (existing.rows.length > 0) {
      const lock = existing.rows[0];
      if (lock.expires_at && new Date(lock.expires_at) > new Date(now.rows[0].now) && lock.user_id !== req.user.id) {
        return res.status(409).json({ error: 'Design is locked by another user.', locked_by_user_id: lock.user_id, expires_at: lock.expires_at });
      }
      await pool.query(
        `UPDATE design_collab_locks SET user_id = $1, locked_at = NOW(), expires_at = NOW() + interval '30 minutes' WHERE design_id = $2`,
        [req.user.id, id]
      );
    } else {
      await pool.query(
        `INSERT INTO design_collab_locks (design_id, user_id, locked_at, expires_at) VALUES ($1, $2, NOW(), NOW() + interval '30 minutes')`,
        [id, req.user.id]
      );
    }
    const out = await pool.query('SELECT * FROM design_collab_locks WHERE design_id = $1', [id]);
    res.json({ lock: out.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/designs/:id/lock/release', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });
    await pool.query('DELETE FROM design_collab_locks WHERE design_id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ released: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// 4. Version control — snapshot/list/restore
// ══════════════════════════════════════════════════════════════
// PRODUCT-DECISION: Snapshot full row (data + ai_result) per checkpoint.
// No diff/merge. Restore overwrites current values.

router.post('/designs/:id/versions', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { label } = req.body || {};
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });
    const r = await pool.query('SELECT name, description, data, ai_result, status FROM building_designs WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Design not found.' });
    const ins = await pool.query(
      `INSERT INTO design_versions (design_id, user_id, label, snapshot) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, req.user.id, label || null, JSON.stringify(r.rows[0])]
    );
    res.json({ version: ins.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/designs/:id/versions', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });
    const rows = await pool.query('SELECT id, design_id, user_id, label, created_at FROM design_versions WHERE design_id = $1 ORDER BY created_at DESC', [id]);
    res.json({ versions: rows.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/designs/:id/versions/:versionId/restore', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const vid = parseInt(req.params.versionId, 10);
    if (isNaN(id) || isNaN(vid)) return res.status(400).json({ error: 'Invalid id(s).' });
    const v = await pool.query('SELECT snapshot FROM design_versions WHERE id = $1 AND design_id = $2', [vid, id]);
    if (v.rows.length === 0) return res.status(404).json({ error: 'Version not found.' });
    const snap = v.rows[0].snapshot;
    await pool.query(
      `UPDATE building_designs SET name = $1, description = $2, data = $3, ai_result = $4, status = $5, updated_at = NOW() WHERE id = $6`,
      [snap.name, snap.description, JSON.stringify(snap.data || {}), JSON.stringify(snap.ai_result || {}), snap.status || 'completed', id]
    );
    res.json({ restored: true, version_id: vid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// 5. POST /api/ai/render-spec  (rendering/visualization spec)
// ══════════════════════════════════════════════════════════════
router.post('/render-spec', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    if (need503(res)) return;
    const { design_summary, view, lighting_mood } = req.body || {};
    if (!design_summary) return res.status(400).json({ error: 'design_summary is required.' });
    const sys = `You are an architectural visualizer. Return ONLY valid JSON describing a render spec.`;
    const user = `Generate render-spec JSON for this design.

Design: ${typeof design_summary === 'string' ? design_summary : JSON.stringify(design_summary)}
View preference: ${view || 'exterior 3-quarter perspective'}
Lighting mood: ${lighting_mood || 'golden hour'}

Return JSON:
{
  "camera": { "view_type": "...", "fov_deg": 0, "height_m": 0, "target": "..." },
  "lighting": { "time_of_day": "...", "sun_azimuth_deg": 0, "sun_altitude_deg": 0, "weather": "...", "hdri_recommendation": "..." },
  "materials_overrides": [{ "surface": "...", "texture_suggestion": "..." }],
  "post_process": { "exposure": 0, "white_balance_k": 5500, "vignette": 0 },
  "engine_hints": { "vray": "...", "blender_cycles": "...", "unreal": "..." }
}`;
    const result = await callOpenRouter(sys, user, 2500);
    await persistAi(req.user.id, 'render-spec', null, 'Render spec', result);
    res.json({ result, disclaimer: 'Spec only — does not produce pixels. Feed to render engine.' });
  } catch (err) {
    console.error('render-spec error:', err.message);
    res.status(500).json({ error: err.message || 'render-spec failed.' });
  }
});

// ══════════════════════════════════════════════════════════════
// 6. POST /api/ai/structural-advisor  (NOT a certified FEA)
// ══════════════════════════════════════════════════════════════
router.post('/structural-advisor', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    if (need503(res)) return;
    const { project_type, span_m, num_floors, seismic_zone, soil_type, loads_summary } = req.body || {};
    if (!project_type) return res.status(400).json({ error: 'project_type is required.' });
    const sys = `You are a structural engineer giving preliminary guidance. NOT a certified FEA. Return ONLY valid JSON.`;
    const user = `Provide preliminary structural recommendations.
Project type: ${project_type}
Span: ${span_m || 'unspecified'} m
Floors: ${num_floors || 'unspecified'}
Seismic zone: ${seismic_zone || 'unspecified'}
Soil type: ${soil_type || 'unspecified'}
Loads: ${loads_summary || 'unspecified'}

Return JSON:
{
  "recommended_system": "...",
  "primary_members": [{ "type": "...", "size_guideline": "...", "spacing_m": 0 }],
  "lateral_system": "...",
  "foundation_recommendation": "...",
  "code_references": ["..."],
  "limitations": "Preliminary only — requires licensed engineer FEA validation."
}`;
    const result = await callOpenRouter(sys, user, 2500);
    await persistAi(req.user.id, 'structural-advisor', null, 'Structural advisor', result);
    res.json({ result, disclaimer: 'Preliminary advisory output — must be validated by a licensed PE before construction.' });
  } catch (err) {
    console.error('structural-advisor error:', err.message);
    res.status(500).json({ error: err.message || 'structural-advisor failed.' });
  }
});

// ══════════════════════════════════════════════════════════════
// 7. POST /api/ai/energy-model  (caller supplies climate inputs)
// ══════════════════════════════════════════════════════════════
// PRODUCT-DECISION: No external climate-data fetch. Caller supplies
// HDD/CDD, latitude, sun_hours, fuel mix.
router.post('/energy-model', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    if (need503(res)) return;
    const { sq_footage, num_floors, envelope_r_value, hvac_type, hdd, cdd, latitude_deg, sun_hours_per_day, fuel_mix } = req.body || {};
    if (!sq_footage) return res.status(400).json({ error: 'sq_footage is required.' });
    const sys = `You are a building energy modeler. Return ONLY valid JSON estimates.`;
    const user = `Estimate annual energy use & emissions.
sq_footage: ${sq_footage}
floors: ${num_floors || 1}
envelope_r_value: ${envelope_r_value || 'unspecified'}
hvac_type: ${hvac_type || 'unspecified'}
HDD: ${hdd || 'unspecified'}
CDD: ${cdd || 'unspecified'}
latitude: ${latitude_deg || 'unspecified'}
sun_hours_per_day: ${sun_hours_per_day || 'unspecified'}
fuel_mix: ${fuel_mix ? JSON.stringify(fuel_mix) : 'electricity-only'}

Return JSON:
{
  "annual_kwh": 0,
  "annual_therms": 0,
  "annual_kg_co2e": 0,
  "eui_kbtu_per_sqft": 0,
  "peak_kw": 0,
  "passive_solar_potential_kwh_yr": 0,
  "improvement_recommendations": [{ "measure": "...", "annual_kwh_saved": 0, "payback_years": 0 }],
  "assumptions": ["..."]
}`;
    const result = await callOpenRouter(sys, user, 3000);
    await persistAi(req.user.id, 'energy-model', null, `Energy model — ${sq_footage} sqft`, result);
    res.json({ result });
  } catch (err) {
    console.error('energy-model error:', err.message);
    res.status(500).json({ error: err.message || 'energy-model failed.' });
  }
});

// ══════════════════════════════════════════════════════════════
// 8. POST /api/ai/plugin-export  (Revit/AutoCAD/SketchUp JSON descriptor)
// ══════════════════════════════════════════════════════════════
// Format-aware JSON descriptors only. No binary export. Disclaimer fenced.
router.post('/plugin-export', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    if (need503(res)) return;
    const { design_id, target } = req.body || {};
    const supported = ['revit', 'autocad', 'sketchup'];
    if (!target || !supported.includes(String(target).toLowerCase())) {
      return res.status(400).json({ error: `target must be one of: ${supported.join(', ')}` });
    }
    let summary = `design id ${design_id || 'unknown'}`;
    if (design_id) {
      const r = await pool.query('SELECT name, description, data, ai_result FROM building_designs WHERE id = $1 AND user_id = $2', [design_id, req.user.id]);
      if (r.rows.length === 0) return res.status(404).json({ error: 'Design not found.' });
      summary = JSON.stringify(r.rows[0]);
    }
    const sys = `You are a CAD/BIM exporter producing a JSON descriptor for a target tool. Return ONLY valid JSON.`;
    const user = `Produce a JSON export descriptor for ${target}.
Design: ${summary}

Return JSON:
{
  "target": "${target}",
  "schema_version": "v1",
  "objects": [{ "id": "...", "kind": "...", "params": {} }],
  "import_notes": "Instructions for the user to manually import into the target tool.",
  "disclaimer": "JSON descriptor only — does NOT produce a binary .rvt/.dwg/.skp file. Manual import required."
}`;
    const result = await callOpenRouter(sys, user, 3000);
    await persistAi(req.user.id, 'plugin-export', design_id || null, `Plugin export ${target}`, result);
    res.json({ result, target, disclaimer: 'JSON descriptor only — does NOT produce binary CAD/BIM files.' });
  } catch (err) {
    console.error('plugin-export error:', err.message);
    res.status(500).json({ error: err.message || 'plugin-export failed.' });
  }
});

// ══════════════════════════════════════════════════════════════
// 9. Material library (CRUD)
// ══════════════════════════════════════════════════════════════
router.get('/material-library', authMiddleware, async (req, res) => {
  try {
    const cat = req.query.category;
    const params = [req.user.id];
    let q = 'SELECT * FROM material_library_items WHERE user_id = $1';
    if (cat) { params.push(cat); q += ` AND category = $${params.length}`; }
    q += ' ORDER BY created_at DESC LIMIT 500';
    const rows = await pool.query(q, params);
    res.json({ items: rows.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/material-library', authMiddleware, async (req, res) => {
  try {
    const { name, category, data } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required.' });
    const ins = await pool.query(
      `INSERT INTO material_library_items (user_id, name, category, data) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, name, category || null, JSON.stringify(data || {})]
    );
    res.json({ item: ins.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/material-library/:id', authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid id.' });
    await pool.query('DELETE FROM material_library_items WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// 10. POST /api/ai/cad-conversion  (sketch/notes -> CAD-ready spec)
// ══════════════════════════════════════════════════════════════
router.post('/cad-conversion', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    if (need503(res)) return;
    const { sketch_description, target_units, target_format } = req.body || {};
    if (!sketch_description) return res.status(400).json({ error: 'sketch_description is required.' });
    const sys = `You are a CAD draftsperson. Return ONLY valid JSON describing a CAD-ready spec.`;
    const user = `Convert the following hand sketch description into a CAD-ready spec.

Sketch description: ${sketch_description}
Target units: ${target_units || 'meters'}
Target format hint: ${target_format || 'dwg'}

Return JSON:
{
  "units": "${target_units || 'meters'}",
  "layers": [{ "name": "...", "color": "...", "linetype": "..." }],
  "entities": [{ "layer": "...", "type": "line|arc|polyline|text", "params": {} }],
  "dimensions": [{ "type": "linear|angular|radial", "from": "...", "to": "...", "value": 0 }],
  "title_block": { "project": "...", "scale": "1:100", "drawn_by": "..." },
  "disclaimer": "Spec only — feed to a CAD tool to produce binary file."
}`;
    const result = await callOpenRouter(sys, user, 3000);
    await persistAi(req.user.id, 'cad-conversion', null, 'CAD conversion', result);
    res.json({ result, disclaimer: 'JSON spec — manual CAD import required.' });
  } catch (err) {
    console.error('cad-conversion error:', err.message);
    res.status(500).json({ error: err.message || 'cad-conversion failed.' });
  }
});

module.exports = router;
