# Completeness Review: AIArchitecturalDesignGenerator

- **Review date:** 2026-07-18
- **Assessment basis:** Static source and configuration inspection only. Dependencies were not installed, and no build, database migration, external integration, or runtime workflow was executed.

## Classification

**Prototype-demo**

## Verdict

The repository presents a broad design and spatial planning surface (72 source files and 21 route modules), but the static evidence is characteristic of a generated prototype. Pages and endpoints demonstrate concepts; they do not establish a verified execution path for convert requirements and site constraints into editable, dimensioned alternatives and deliverables.

## Why it is not complete

- 23 files are explicitly named as gap/gap-feature implementations; route/page count therefore overstates completed product capability.
- 21 files reference model-provider or chat-completion behavior; these generic LLM paths are not a substitute for deterministic domain execution, grounding, or evaluation.
- 28 files contain mock, sample, placeholder, or random-data signals, leaving important outcomes disconnected from authoritative systems.
- Only 1 recognizable test file was found, insufficient to prove the full workflow and failure modes.
- No CI workflow was found to continuously verify builds, tests, migrations, or security checks.
- No environment example/template was found, so required configuration and secret boundaries are undocumented.

## Needed features

- 1. Implement a workflow to convert requirements and site constraints into editable, dimensioned alternatives and deliverables.
- 2. Connect CAD/BIM/GIS, product catalogs, render workers, and object storage; replace seed/demo records with durable, synchronized data and explicit failure handling.
- 3. Validate dimensions, codes, constructability, quantities, and render/export fidelity.
- 4. Enforce licensed assets, safety disclaimers, provenance, and professional approval.
- 5. Add contract, integration, authorization, migration, and end-to-end tests in CI, plus a documented non-destructive deployment/run path.

## Risks or launch blockers

- Credential/secret fallback or demo-password patterns occur in 3 files and must be removed or made development-only.
- TLS certificate verification is disabled in inspected code; this is a release blocker.
- The root launcher can terminate unrelated processes occupying configured ports.
- The root launcher seeds, creates, migrates, or otherwise mutates database state during startup.
- The root launcher installs dependencies at run time, reducing reproducibility and expanding supply-chain risk.
- Ungrounded or malformed model output can become a domain action unless schemas, evidence, evaluations, and approval gates are added.

## Evidence inspected

- `backend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `frontend/package.json` — declared scripts, runtime dependencies, and application boundaries.
- `backend/src/server.js` — service composition, middleware, and registered routes.
- `frontend/src/App.jsx` — front-end navigation and visible workflow surface.
- `backend/src/routes/ai.js` — implemented API surface and domain/AI request handling.
- `backend/src/routes/aiBacklog.js` — implemented API surface and domain/AI request handling.

## Recommended next action

Treat this as a prototype: select one narrow design and spatial planning outcome, remove or quarantine generated gap routes, and implement that outcome end to end with real data, deterministic rules, and tests before adding features.

## Implementation progress

**Local status (2026-07-18): implemented; professional and toolchain validation remain blocked.**

1. `governedDesigns.js`, `designPolicy.js`, and migration `001_governed_designs.sql` now persist briefs, requirements/site constraints, editable dimensioned alternatives, quantities, validation results, review/approval/export states, optimistic versions, and append-only events.
2. CAD/BIM, GIS, product-catalog, render-worker, and object-storage work is represented by a typed idempotent outbox with explicit failure/dead-letter state. Export/render operations require approval; no unavailable adapter or licensed catalog is reported as connected.
3. Deterministic positive-dimension, gross-area, site-capacity, quantity, and utilization checks are versioned and tested. Jurisdictional code, structural, energy, constructability, and export-fidelity validation require authoritative rules, real CAD/BIM workers, and licensed professionals.
4. Tenant/owner scope, architect/reviewer/admin roles, professional approval notes, immutable provenance events, strict TLS/JWT/database secrets, and opt-in experimental model routes prevent generated output from approving or exporting a design.
5. Startup no longer initializes the schema, installs, seeds, or kills ports. Environment docs, locked bootstrap, explicit migration, guarded demo seed, tests, and PostgreSQL base-schema/migration plus frontend build CI were added.

Validation completed without starting services, CAD/BIM, render workers, or a database: shell/JavaScript syntax and `npm test` passed 2/2. CI is configured for base schema, forward migration, and frontend build. Licensed assets/catalogs, jurisdiction datasets, professional code/structural approval, and export-fidelity testing remain launch blockers.
