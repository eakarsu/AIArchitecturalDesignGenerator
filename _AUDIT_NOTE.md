# Audit Apply Note — AIArchitecturalDesignGenerator

## Audit recommendations (from batch_00.md)

Template-clone per audit; 4 route files but inspection of `backend/src/routes/ai.js` + `aiExtras.js` shows ~13 AI endpoints already (`/generate-design`, `/space-optimizer`, `/material-recommender`, `/code-compliance-check`, `/cost-estimator`, `/stream-design`, `/designs/:id/upload`, `/accessibility-audit`, `/color-harmony`, `/comments`, `/furniture-arrangement`, `/lighting-simulation`, `/template`).

### Missing AI counterparts
- AI precedent project search (find similar past projects)
- AI design-to-BIM conversion (convert 2D to 3D)

### Missing non-AI features
- Collaboration tools (multi-user design editing)
- Design version control
- Rendering/visualization
- Structural analysis

### Custom feature suggestions
- Design-to-CAD conversion
- Real-time BIM generation
- Energy modeling
- Material library
- Revit / AutoCAD / SketchUp plugins

## Implemented in this pass

None. Project already has 13 AI endpoints covering most domains. Genuinely missing items (BIM conversion, precedent vector search) require new infrastructure.

## Backlog (not implemented)

| Item | Category | Reason |
|---|---|---|
| Precedent project search | TOO-RISKY | Vector DB / corpus indexing |
| Design-to-BIM conversion | TOO-RISKY | Heavy 2D→3D pipeline |
| Multi-user collaboration | TOO-RISKY | Realtime sync infra |
| Version control | NEEDS-PRODUCT-DECISION | Schema design |
| Rendering / visualization | TOO-RISKY | Render service |
| Structural analysis | TOO-RISKY | FEA engine |
| Revit / AutoCAD / SketchUp plugins | TOO-RISKY | New project surfaces |
| Energy modeling | NEEDS-PRODUCT-DECISION | Climate-data sourcing |

## Apply pass 3 (frontend)

LEFT-AS-IS. The Vite/React frontend already provides a comprehensive AI surface:
- `pages/AIExtras.jsx` (6-tab UI for template, accessibility, comments+synth, color, lighting, furniture)
- `pages/DesignCompare.jsx` calling `POST /api/ai/compare-designs`
- `pages/AIHistory.jsx` for history
- Generic `FeaturePage` -> `POST /:featureKey/:id/generate` dispatcher (covers per-design AI runs)

Pass 3 made no code changes. The 5 primary `routes/ai.js` endpoints (`/generate-design`, `/space-optimizer`, `/material-recommender`, `/code-compliance-check`, `/cost-estimator`) remain backend-only — the audited UX uses the per-design `:id/generate` flow + AIExtras tabs instead. Surfacing the primaries directly is backlog (NEEDS-PRODUCT-DECISION: would be a parallel "ad-hoc AI" panel rather than design-bound).

## Apply pass 4 (mechanical backlog)

LEFT-AS-IS. All backlog items are TOO-RISKY (BIM conversion, vector
precedent search, realtime collaboration, FEA, render service, plugin
surfaces) or NEEDS-PRODUCT-DECISION (version control schema, energy
modeling). No MECHANICAL items remain. Skipping per pass-4 scope.

## Apply pass 5 (all backlog)

IMPLEMENTED — 10 features (cap reached) covering all remaining backlog
through additive endpoints, in-memory stubs, and AI-driven JSON specs.

New file `backend/src/routes/aiBacklog.js` (idempotent
`CREATE TABLE IF NOT EXISTS` for `design_versions`, `design_comments`,
`design_collab_locks`, `material_library_items`). Mounted at `/api/ai`
in `server.js`.

Features (10 of 10):
1. **POST /api/ai/precedent-search** — TOO-RISKY mitigated. In-memory
   token-overlap Jaccard similarity over the user's past `building_designs`.
   No vector DB / embeddings. Returns top-N with score.
2. **POST /api/ai/design-to-bim** — TOO-RISKY mitigated. AI-generated
   structured JSON BIM descriptor (not IFC). 503 if `OPENROUTER_API_KEY` unset.
3. **GET/POST /api/ai/designs/:id/comments + lock claim/release** —
   TOO-RISKY mitigated. Persistent comment thread + 30-min soft-lock.
   No realtime CRDT/OT.
4. **POST/GET /api/ai/designs/:id/versions + restore** — PRODUCT-DECISION:
   snapshot full row (data + ai_result). No diff/merge engine. Restore
   overwrites current row from snapshot.
5. **POST /api/ai/render-spec** — TOO-RISKY mitigated. AI-generated
   camera/lighting/materials JSON spec; does not produce pixels.
   503 if AI unset.
6. **POST /api/ai/structural-advisor** — TOO-RISKY mitigated. AI-driven
   preliminary structural guidance. Explicit disclaimer that licensed PE FEA
   validation is required. 503 if AI unset.
7. **POST /api/ai/energy-model** — PRODUCT-DECISION: caller supplies climate
   inputs (HDD, CDD, latitude, sun_hours, fuel_mix). No external climate-data
   fetch. 503 if AI unset.
8. **POST /api/ai/plugin-export** — TOO-RISKY mitigated. JSON descriptor for
   Revit / AutoCAD / SketchUp; no binary file generation. 503 if AI unset.
9. **GET/POST/DELETE /api/ai/material-library** — material library CRUD
   per user.
10. **POST /api/ai/cad-conversion** — TOO-RISKY mitigated. AI-generated
    CAD-ready JSON spec from sketch description. 503 if AI unset.

Frontend: new `frontend/src/pages/AIBacklog.jsx` with 10-tab tool surface,
JWT bearer attached, 503 displayed inline with `missing:` env var
disclosure. Route `/ai-backlog` registered in `App.jsx`. Navbar
"🧰 Backlog" button added.

ENV vars referenced: `OPENROUTER_API_KEY` (already used; gates AI tools).

Validation: `node --check backend/src/routes/aiBacklog.js` PASS;
`node --check backend/src/server.js` PASS; `esbuild` JSX parse PASS for
AIBacklog.jsx and App.jsx.

Smoke test: PASS — alt port 3501, `OPENROUTER_API_KEY=""`. Registered new
user, logged in. `precedent-search` returned 200 with empty results
(in-memory works without AI). `design-to-bim` returned `HTTP 503` with
`{"error":"AI not configured","missing":"OPENROUTER_API_KEY"}`.
`material-library` GET returned `{"items":[]}`. Server killed after.

No `npm install`, no new dependencies.
