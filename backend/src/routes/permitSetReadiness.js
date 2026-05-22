const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    summary: { drawing_sets: 9, permit_ready: 5, code_conflicts: 7, missing_sheets: 4 },
    sets: [
      { project: 'Cedar ADU', jurisdiction: 'Austin', readiness: 92, blockers: ['energy form signature'], status: 'nearly ready' },
      { project: 'Maple Clinic', jurisdiction: 'Denver', readiness: 74, blockers: ['egress schedule', 'accessibility detail'], status: 'needs revision' },
      { project: 'Harbor Retail', jurisdiction: 'Seattle', readiness: 61, blockers: ['stormwater sheet', 'fire lane note'], status: 'incomplete' },
    ],
  });
});

router.post('/check', (req, res) => {
  const { sheets = [], jurisdiction = 'local' } = req.body || {};
  const required = ['site plan', 'floor plan', 'life safety', 'energy compliance'];
  const missing = required.filter((item) => !sheets.map((s) => String(s).toLowerCase()).includes(item));
  res.json({ jurisdiction, missing, ready: missing.length === 0 });
});

module.exports = router;
