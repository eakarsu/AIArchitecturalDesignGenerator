// Custom Views routes for AIArchitecturalDesignGenerator
// Four endpoints:
//   GET  /api/custom-views/floor-plans
//   GET  /api/custom-views/design-gallery
//   GET  /api/custom-views/design-spec-pdf?project_id=...
//   POST /api/custom-views/code-compliance  { design_params: {...} }
//
// Data is fully synthesized (no DB or external AI dependency required) so endpoints
// always respond 200 and remain deterministic per input.

const express = require('express');
const router = express.Router();

let PDFDocument;
try {
  PDFDocument = require('pdfkit');
} catch (_) {
  PDFDocument = null;
}

// ── Synthesized seed data ──────────────────────────────────────────
const FLOOR_PLANS = [
  {
    id: 'fp-001',
    name: 'Modern 2-Bedroom Apartment',
    style: 'Contemporary',
    sq_ft: 1180,
    rooms: [
      { id: 'r1', label: 'Living Room', x: 20,  y: 20,  w: 220, h: 180 },
      { id: 'r2', label: 'Kitchen',     x: 240, y: 20,  w: 160, h: 120 },
      { id: 'r3', label: 'Dining',      x: 240, y: 140, w: 160, h: 60  },
      { id: 'r4', label: 'Master Bed',  x: 20,  y: 200, w: 200, h: 160 },
      { id: 'r5', label: 'Bedroom 2',   x: 220, y: 200, w: 180, h: 100 },
      { id: 'r6', label: 'Bathroom',    x: 220, y: 300, w: 90,  h: 60  },
      { id: 'r7', label: 'Hall',        x: 310, y: 300, w: 90,  h: 60  },
    ],
    walls: [
      { x1: 20,  y1: 20,  x2: 400, y2: 20  },
      { x1: 400, y1: 20,  x2: 400, y2: 360 },
      { x1: 400, y1: 360, x2: 20,  y2: 360 },
      { x1: 20,  y1: 360, x2: 20,  y2: 20  },
      { x1: 240, y1: 20,  x2: 240, y2: 200 },
      { x1: 20,  y1: 200, x2: 400, y2: 200 },
      { x1: 220, y1: 200, x2: 220, y2: 360 },
      { x1: 310, y1: 300, x2: 310, y2: 360 },
    ],
    doors: [
      { x: 80,  y: 200, dir: 'h' },
      { x: 270, y: 140, dir: 'h' },
      { x: 240, y: 80,  dir: 'v' },
      { x: 260, y: 300, dir: 'h' },
    ],
  },
  {
    id: 'fp-002',
    name: 'Open-Plan Studio Loft',
    style: 'Industrial',
    sq_ft: 720,
    rooms: [
      { id: 'r1', label: 'Living / Sleep', x: 20,  y: 20,  w: 260, h: 240 },
      { id: 'r2', label: 'Kitchenette',    x: 280, y: 20,  w: 120, h: 120 },
      { id: 'r3', label: 'Bathroom',       x: 280, y: 140, w: 120, h: 120 },
    ],
    walls: [
      { x1: 20,  y1: 20,  x2: 400, y2: 20  },
      { x1: 400, y1: 20,  x2: 400, y2: 260 },
      { x1: 400, y1: 260, x2: 20,  y2: 260 },
      { x1: 20,  y1: 260, x2: 20,  y2: 20  },
      { x1: 280, y1: 20,  x2: 280, y2: 260 },
      { x1: 280, y1: 140, x2: 400, y2: 140 },
    ],
    doors: [
      { x: 280, y: 80,  dir: 'v' },
      { x: 320, y: 140, dir: 'h' },
    ],
  },
  {
    id: 'fp-003',
    name: 'Suburban 3BR Single-Family',
    style: 'Traditional',
    sq_ft: 1980,
    rooms: [
      { id: 'r1', label: 'Living Room',  x: 20,  y: 20,  w: 220, h: 180 },
      { id: 'r2', label: 'Kitchen',      x: 240, y: 20,  w: 160, h: 100 },
      { id: 'r3', label: 'Dining',       x: 240, y: 120, w: 160, h: 80  },
      { id: 'r4', label: 'Master Bed',   x: 20,  y: 200, w: 180, h: 160 },
      { id: 'r5', label: 'Master Bath',  x: 200, y: 200, w: 80,  h: 80  },
      { id: 'r6', label: 'Bedroom 2',    x: 280, y: 200, w: 120, h: 80  },
      { id: 'r7', label: 'Bedroom 3',    x: 200, y: 280, w: 120, h: 80  },
      { id: 'r8', label: 'Bath 2',       x: 320, y: 280, w: 80,  h: 80  },
    ],
    walls: [
      { x1: 20,  y1: 20,  x2: 400, y2: 20  },
      { x1: 400, y1: 20,  x2: 400, y2: 360 },
      { x1: 400, y1: 360, x2: 20,  y2: 360 },
      { x1: 20,  y1: 360, x2: 20,  y2: 20  },
      { x1: 240, y1: 20,  x2: 240, y2: 200 },
      { x1: 20,  y1: 200, x2: 400, y2: 200 },
      { x1: 200, y1: 200, x2: 200, y2: 360 },
      { x1: 280, y1: 200, x2: 280, y2: 280 },
      { x1: 200, y1: 280, x2: 400, y2: 280 },
      { x1: 320, y1: 280, x2: 320, y2: 360 },
    ],
    doors: [
      { x: 100, y: 200, dir: 'h' },
      { x: 260, y: 120, dir: 'h' },
      { x: 240, y: 80,  dir: 'v' },
      { x: 220, y: 280, dir: 'h' },
      { x: 340, y: 280, dir: 'h' },
    ],
  },
];

const DESIGN_VARIANTS = [
  {
    id: 'dv-001',
    style: 'Contemporary Minimalist',
    thumbnail: '#0f766e',
    accent: '#5eead4',
    cost_estimate_usd: 248000,
    sq_ft: 1180,
    notes: 'Open floor plan, low ornamentation, sustainable materials.',
  },
  {
    id: 'dv-002',
    style: 'Industrial Loft',
    thumbnail: '#92400e',
    accent: '#fbbf24',
    cost_estimate_usd: 312000,
    sq_ft: 1480,
    notes: 'Exposed brick, polished concrete floor, steel beams.',
  },
  {
    id: 'dv-003',
    style: 'Scandinavian',
    thumbnail: '#1e3a8a',
    accent: '#bfdbfe',
    cost_estimate_usd: 286000,
    sq_ft: 1320,
    notes: 'Light wood, white walls, large windows for natural light.',
  },
  {
    id: 'dv-004',
    style: 'Mid-Century Modern',
    thumbnail: '#7c2d12',
    accent: '#fdba74',
    cost_estimate_usd: 298000,
    sq_ft: 1410,
    notes: 'Walnut accents, geometric forms, integrated furniture.',
  },
  {
    id: 'dv-005',
    style: 'Traditional Craftsman',
    thumbnail: '#365314',
    accent: '#bef264',
    cost_estimate_usd: 364000,
    sq_ft: 1980,
    notes: 'Wood siding, gabled roof, generous porches.',
  },
  {
    id: 'dv-006',
    style: 'Mediterranean Villa',
    thumbnail: '#9f1239',
    accent: '#fda4af',
    cost_estimate_usd: 412000,
    sq_ft: 2240,
    notes: 'Stucco walls, terracotta tile roof, arched openings.',
  },
];

const PROJECTS = [
  {
    id: 'proj-001',
    name: 'Riverside Residence',
    address: '128 Riverside Dr, Portland OR',
    architect: 'Aurora Studio',
    rooms: [
      { name: 'Living Room', sq_ft: 320 },
      { name: 'Kitchen',     sq_ft: 180 },
      { name: 'Master Bed',  sq_ft: 280 },
      { name: 'Bedroom 2',   sq_ft: 180 },
      { name: 'Bathroom',    sq_ft: 80  },
      { name: 'Hall',        sq_ft: 80  },
    ],
    materials: [
      { name: 'Engineered oak flooring', qty: '1180 sq ft', spec: 'ASTM E648 Class 1' },
      { name: 'Gypsum board walls',      qty: '2640 sq ft', spec: '5/8 in Type X' },
      { name: 'Double-glazed windows',   qty: '14 units',   spec: 'U-0.30, SHGC 0.40' },
      { name: 'Recessed LED downlights', qty: '38 units',   spec: '9W 3000K 90CRI' },
    ],
    code_refs: [
      { code: 'IBC 2021', section: '1006.2.1', topic: 'Single exit allowed' },
      { code: 'IBC 2021', section: '1207.2',   topic: 'Wall sound transmission STC 50' },
      { code: 'NEC 2023', section: '210.52',   topic: 'Receptacle outlet spacing' },
      { code: 'NEC 2023', section: '210.8(A)', topic: 'GFCI required in kitchen/bath' },
    ],
  },
  {
    id: 'proj-002',
    name: 'Downtown Loft Conversion',
    address: '402 Market St, Seattle WA',
    architect: 'Borealis Architects',
    rooms: [
      { name: 'Open Living', sq_ft: 520 },
      { name: 'Kitchenette', sq_ft: 110 },
      { name: 'Bathroom',    sq_ft: 90  },
    ],
    materials: [
      { name: 'Polished concrete floor', qty: '720 sq ft',  spec: '4000 psi sealed' },
      { name: 'Exposed brick',           qty: '480 sq ft',  spec: 'Reclaimed local' },
      { name: 'Steel I-beams',           qty: '6 units',    spec: 'W8x18 ASTM A992' },
      { name: 'Industrial pendant',      qty: '12 units',   spec: '12W 2700K' },
    ],
    code_refs: [
      { code: 'IBC 2021', section: '1011.5',    topic: 'Stair riser/tread requirements' },
      { code: 'IBC 2021', section: '703.2',     topic: 'Fire-resistance ratings' },
      { code: 'NEC 2023', section: '406.4(D)',  topic: 'Tamper-resistant receptacles' },
    ],
  },
  {
    id: 'proj-003',
    name: 'Maple Ridge Family Home',
    address: '88 Maple Ridge Ln, Boulder CO',
    architect: 'Cardinal Design Group',
    rooms: [
      { name: 'Living Room', sq_ft: 380 },
      { name: 'Kitchen',     sq_ft: 220 },
      { name: 'Dining',      sq_ft: 180 },
      { name: 'Master Bed',  sq_ft: 300 },
      { name: 'Master Bath', sq_ft: 110 },
      { name: 'Bedroom 2',   sq_ft: 160 },
      { name: 'Bedroom 3',   sq_ft: 160 },
      { name: 'Bath 2',      sq_ft: 90  },
    ],
    materials: [
      { name: 'Hardwood flooring',       qty: '1620 sq ft', spec: 'Solid white oak 3/4 in' },
      { name: 'Composite roof shingles', qty: '2400 sq ft', spec: 'Class A fire rating' },
      { name: 'Spray foam insulation',   qty: '3200 sq ft', spec: 'R-21 closed cell' },
      { name: 'Triple-pane windows',     qty: '22 units',   spec: 'U-0.22, SHGC 0.35' },
    ],
    code_refs: [
      { code: 'IBC 2021', section: '1208.2', topic: 'Minimum room dimensions' },
      { code: 'IBC 2021', section: '907.2',  topic: 'Smoke alarm placement' },
      { code: 'NEC 2023', section: '210.12', topic: 'AFCI protection in dwellings' },
      { code: 'NEC 2023', section: '300.4',  topic: 'Protection against physical damage' },
    ],
  },
];

// ── Compliance ruleset (synthesized but realistic) ─────────────────
function runComplianceCheck(params) {
  const p = params || {};
  const occupancy = (p.occupancy_type || 'R-3').toString();
  const sqft = Number(p.total_sq_ft || 0);
  const ceilingHeight = Number(p.ceiling_height_ft || 0);
  const exitCount = Number(p.exit_count || 0);
  const stairWidth = Number(p.stair_width_in || 0);
  const receptacleSpacing = Number(p.receptacle_spacing_ft || 0);
  const gfciKitchen = !!p.gfci_kitchen;
  const afciProtection = !!p.afci_protection;
  const smokeAlarms = !!p.smoke_alarms;
  const fireRatingHr = Number(p.fire_rating_hr || 0);
  const insulationR = Number(p.insulation_r_value || 0);

  const results = [];

  results.push({
    code: 'IBC 2021',
    section: '1208.2',
    rule: 'Habitable spaces shall have a ceiling height of at least 7 ft 6 in (7.5 ft).',
    value: `${ceilingHeight} ft`,
    pass: ceilingHeight >= 7.5,
  });
  results.push({
    code: 'IBC 2021',
    section: '1006.2.1',
    rule: occupancy.startsWith('R') ? 'Dwellings allow a single exit up to 2000 sq ft.' : 'Non-residential needs 2 exits for >500 sq ft.',
    value: `${exitCount} exit(s), ${sqft} sq ft, occupancy ${occupancy}`,
    pass: occupancy.startsWith('R')
      ? (sqft <= 2000 ? exitCount >= 1 : exitCount >= 2)
      : (sqft <= 500 ? exitCount >= 1 : exitCount >= 2),
  });
  results.push({
    code: 'IBC 2021',
    section: '1011.5.2',
    rule: 'Stair width minimum 36 in (44 in if occupant load >50).',
    value: `${stairWidth} in`,
    pass: stairWidth >= 36,
  });
  results.push({
    code: 'IBC 2021',
    section: '703.2',
    rule: 'Fire-resistance rating between dwelling units must be at least 1 hour.',
    value: `${fireRatingHr} hr`,
    pass: fireRatingHr >= 1,
  });
  results.push({
    code: 'IBC 2021',
    section: '907.2.11',
    rule: 'Smoke alarms required in all sleeping rooms and adjoining hallways.',
    value: smokeAlarms ? 'present' : 'missing',
    pass: smokeAlarms,
  });
  results.push({
    code: 'IBC 2021',
    section: 'IECC R402',
    rule: 'Ceiling insulation R-value should be at least R-30 (climate zone 4–5).',
    value: `R-${insulationR}`,
    pass: insulationR >= 30,
  });
  results.push({
    code: 'NEC 2023',
    section: '210.52(A)',
    rule: 'Receptacle outlets in habitable rooms shall be ≤12 ft apart.',
    value: `${receptacleSpacing} ft`,
    pass: receptacleSpacing > 0 && receptacleSpacing <= 12,
  });
  results.push({
    code: 'NEC 2023',
    section: '210.8(A)',
    rule: 'GFCI protection required for kitchen and bathroom receptacles.',
    value: gfciKitchen ? 'present' : 'missing',
    pass: gfciKitchen,
  });
  results.push({
    code: 'NEC 2023',
    section: '210.12',
    rule: 'AFCI protection required for all 15- and 20-amp dwelling branch circuits.',
    value: afciProtection ? 'present' : 'missing',
    pass: afciProtection,
  });

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  return {
    summary: {
      total: results.length,
      passed,
      failed,
      score_pct: Math.round((passed / results.length) * 100),
      overall: failed === 0 ? 'COMPLIANT' : (failed <= 2 ? 'MINOR ISSUES' : 'NON-COMPLIANT'),
    },
    items: results,
    params_received: p,
  };
}

// ── Endpoints ──────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', feature: 'custom-views', endpoints: 4 });
});

router.get('/floor-plans', (_req, res) => {
  res.json({
    success: true,
    count: FLOOR_PLANS.length,
    plans: FLOOR_PLANS,
  });
});

router.get('/design-gallery', (_req, res) => {
  res.json({
    success: true,
    count: DESIGN_VARIANTS.length,
    variants: DESIGN_VARIANTS,
  });
});

router.get('/design-spec-pdf', (req, res) => {
  const projectId = req.query.project_id;
  const projects = PROJECTS;

  if (!projectId) {
    // List projects when no id supplied
    return res.json({
      success: true,
      message: 'Provide ?project_id=<id> to download the PDF.',
      projects: projects.map((p) => ({ id: p.id, name: p.name, address: p.address })),
    });
  }
  const proj = projects.find((p) => p.id === projectId);
  if (!proj) {
    return res.status(404).json({ success: false, error: 'Project not found.' });
  }

  if (!PDFDocument) {
    return res.status(500).json({ success: false, error: 'pdfkit not installed.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${proj.id}-design-spec.pdf"`);

  const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
  doc.pipe(res);

  doc.fontSize(20).fillColor('#0f172a').text('Design Specification', { align: 'left' });
  doc.moveDown(0.3);
  doc.fontSize(14).fillColor('#334155').text(proj.name);
  doc.fontSize(10).fillColor('#64748b').text(proj.address);
  doc.text(`Architect: ${proj.architect}`);
  doc.text(`Project ID: ${proj.id}`);
  doc.moveDown(1);

  doc.fontSize(13).fillColor('#0f172a').text('Rooms & Square Footage', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#1e293b');
  let totalSqFt = 0;
  proj.rooms.forEach((r) => {
    doc.text(`• ${r.name.padEnd(28, ' ')}  ${String(r.sq_ft).padStart(6, ' ')} sq ft`);
    totalSqFt += r.sq_ft;
  });
  doc.moveDown(0.3);
  doc.fontSize(11).fillColor('#0f172a').text(`Total: ${totalSqFt} sq ft`);
  doc.moveDown(1);

  doc.fontSize(13).fillColor('#0f172a').text('Materials Schedule', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#1e293b');
  proj.materials.forEach((m) => {
    doc.text(`• ${m.name} — ${m.qty}  [${m.spec}]`);
  });
  doc.moveDown(1);

  doc.fontSize(13).fillColor('#0f172a').text('Building Code References', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#1e293b');
  proj.code_refs.forEach((c) => {
    doc.text(`• ${c.code}  §${c.section} — ${c.topic}`);
  });

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#94a3b8').text(
    `Generated ${new Date().toISOString()} by AIArchitecturalDesignGenerator – Custom Views`,
    { align: 'center' }
  );

  doc.end();
});

router.post('/code-compliance', (req, res) => {
  try {
    const params = req.body && (req.body.design_params || req.body) || {};
    const result = runComplianceCheck(params);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
