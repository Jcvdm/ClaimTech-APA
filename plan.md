# PRD: Unified Claim Skeleton + Background Sync Engine

## 1. Problem Statement
- Editing a claim currently relies on domain-specific data fetches (estimates, inspections, photos, costings) with fragmented caches and duplicate sync logic.
- Cross-claim contamination risks exist when caches/keys differ per domain; navigation can surface stale/wrong data.
- SSR-prefetch hydrates partial data; client layers (hooks, stores) are not unified, causing redundant network calls and inconsistent state.
- Each domain re-implements optimistic updates, queuing, and conflict handling, increasing complexity and bugs.

## 2. Goals & Non-Goals
### Goals
- Provide a single, normalized claim “skeleton” snapshot for SSR hydration and client consumption.
- Centralize optimistic edits and background sync into a single claim-scoped engine.
- Ensure strong claim isolation across tabs/routes; eliminate cross-claim data leakage.
- Minimize network usage via cache-first reads, incremental refreshes, and batched mutations.
- Support offline-first edits with robust retry/backoff and conflict resolution.

### Non-Goals
- Redesigning the entire UI; initial integration should preserve current components.
- Replacing tRPC/React Query; we standardize their usage but keep them.

## 3. User Stories
- As an adjuster, when I open a claim, I immediately see all core data (summary, estimate, lines, inspections, photos, costings) without waiting on multiple spinners.
- As I type changes (e.g., estimate line description or quantities), the UI updates instantly and syncs in the background.
- When navigating between claims, I never see another claim’s data; edits always apply to the correct claim.
- If I go offline, I can continue editing; changes sync automatically when I’m back online.
- If the server has newer changes, my edits are merged or I’m prompted to resolve conflicts.

## 4. Architecture Overview
- SSR: Server prefetches the claim skeleton via a single tRPC endpoint and hydrates a single cache key per claim.
- Client Store: A normalized ClaimSessionStore (Zustand) holds entities (claims, estimates, lines, photos, inspections, costings) keyed by id with indexes by claimId.
- Change Journal: A claim-scoped queue of operations (insert/update/delete/patch) with metadata, processed by a single Sync Worker.
- DAL Integration: The Sync Worker maps ops to domain-specific tRPC mutations. Reads come from a single skeleton query + selective delta refetch.

## 5. APIs & Contracts
### 5.1 tRPC Read Endpoint
- claim.getSkeletonById({ id: UUID }) → ClaimSkeleton
- ClaimSkeleton shape (example):
  - claim: { id, policy_no, insured, status, updated_at, ... }
  - estimate: { id, claim_id, totals, status, updated_at, ... } | null
  - estimateLines: Array<{ id, estimate_id, sequence_number, description, type, qty, costs..., updated_at }>
  - inspections: [...]
  - photos: [...]
  - costings: [...]
  - notes/logs: [...]
  - versions: { claim: ts, estimate: ts, estimateLines: ts, inspections: ts, photos: ts, costings: ts }

### 5.2 tRPC Delta Read
- claim.getSkeletonDelta({ id, sinceVersion?: Versions }) → Partial<ClaimSkeleton> + versions
- Used for lightweight refresh when the app detects staleness or returns online.

### 5.3 Mutation Endpoints
- Maintain domain routers (estimate, inspection, photo, costing), but register them in a Sync Map:
  - { entityType: 'estimateLine', create, update, delete, batchCreate?, batchUpdate? }
- Mutations return updated entity and updated versions to bump local skeleton.

## 6. Data Model & Normalization (Client)
- entities: {
  - claims: Record<id, Claim>
  - estimates: Record<id, Estimate>
  - estimateLines: Record<id, EstimateLine>
  - photos: Record<id, Photo>
  - inspections: Record<id, Inspection>
  - costings: Record<id, Costing>
}
- indexes: { byClaimId: { estimates: Record<claimId, estimateId>, estimateLines: Record<claimId, id[]> , ... } }
- session: { currentClaimId, lastActivityTime, syncStatus, online, pendingOpsCount }
- selectors: derive slices efficiently (e.g., select lines for current claim/estimate, totals).

## 7. Caching Strategy
- Primary React Query key: ['claimSkeleton', claimId]
- SSR prefetch: hydrate this key only; avoid parallel domain keys during initial render.
- Client reads derive from ClaimSessionStore; skeleton cache is a backing store used for rehydration and refresh.
- On mutation success, patch both the store and the skeleton cache with utils.setQueryData(['claimSkeleton', claimId], updater).
- Invalidate skeleton key on claim navigation away; reset ClaimSessionStore.

## 8. Background Sync Engine
- Change Journal entry: { id, claimId, entityType, op: 'insert'|'update'|'delete'|'patch', entityId|tempId, payload, createdAt, attempt, lastError, dependsOn?, version }
- Sync Worker loop:
  1) If offline or syncing, pause.
  2) Batch compatible ops (e.g., multiple estimateLine updates) when safe.
  3) Map to tRPC mutations; handle 409/412 (conflict/precondition) distinctly.
  4) On success: update entities, clear dirty flags, bump versions, remove op.
  5) On failure: backoff with jitter; persist lastError.
- Supports optimistic tempId → realId replacement with consistent lastActivityTime bump.

## 9. Conflict Detection & Resolution
- Versioning: keep per-entity updated_at or integer version; include If-Match/If-Unmodified-Since semantics where possible.
- Merge policy:
  - Primitive fields: last-write-wins by default; allow server-wins for sensitive fields.
  - Collections (lines/photos): reconcile by id; keep client inserts if server doesn’t know them yet.
- On irreconcilable conflicts: surface a “needs review” toast and keep both versions for user decision; provide revert/overwrite buttons.

## 10. Offline-First Behavior
- Persist ClaimSessionStore and Change Journal in IndexedDB (via zustand-persist + idb)
- Queue edits while offline; replay when online.
- Prevent duplicate ops through idempotency keys per change.

## 11. Security & Isolation
- Strict claim scoping in all server reads/writes with Supabase RLS verifying created_by_employee_id matches user.
- Claim-aware session: currentClaimId must match for any local edit; guard and auto-reset on mismatch.
- In SSR, ensure user token is validated; never leak data across users/claims.

## 12. Telemetry & Observability
- Emit structured logs for: initialization, navigation, prefetch, sync start/end, conflicts, retries, contamination detections.
- Expose a lightweight Debug Panel to show pending ops, last sync, and per-entity dirty status.

## 13. Integration Plan (High-Level)
- Add claim.getSkeletonById and optional getSkeletonDelta.
- Create ClaimSessionStore (migrate estimateStore slice into it).
- Update claim page to fetch/hydrate via skeleton; remove legacy useEstimate in favor of skeleton selectors.
- Refactor estimate editing to read/write normalized store; register estimateLine ops in Sync Map.
- Implement journal + worker; wire online/offline detection; persist journal.
- Add staleness checks and delta refreshes.
- Add contamination/invalidation on claim navigation; consolidate prefetch flows.

## 14. Risks & Mitigations
- Risk: Large skeleton payloads. Mitigation: include toggles for which subgraphs to include; lazy-load heavy collections (photos) after initial paint.
- Risk: Merge complexity across entities. Mitigation: start with estimates/lines; expand gradually with clearly defined policies.
- Risk: Double sources of truth. Mitigation: normalized store is authoritative for UI; skeleton cache only seeds/refreshes.

## 15. Acceptance Criteria
- Opening a claim fetches and hydrates a single skeleton; UI renders from store without additional spinners (beyond heavy assets).
- Navigating to another claim does not show data from the previous claim (verified by logs and QA).
- Editing estimate lines updates immediately and survives route changes and offline periods; background sync reconciles with server.
- React Query shows one primary key per claim for claim data; domain queries are optional and consistent when used.
- Debug panel shows pending ops clearing as mutations succeed; conflicts are surfaced with clear user choices.


## 16. Step-by-Step Implementation Guide (Type-Safe, Verifiable)

This guide is structured so you can implement incrementally and ask me to verify each change. After each step, run the listed checks and share outputs/logs for review.

### Step 1 — Database Schema Inventory (Read-only)
- Objective: Confirm current tables, columns, types, FKs for claim-centric resources.
- Targets: claims, estimates, estimate_lines, inspections, photos (attachments), costings, logs/notes.
- What to gather (read-only SQL against CPA project):
  - information_schema.tables (public schema) for the above tables
  - information_schema.columns for each table (name, data_type, is_nullable, default)
  - Foreign keys (pg_constraint joins) ensuring relationships:
    - estimates.claim_id → claims.id (ON DELETE CASCADE/RESTRICT?)
    - estimate_lines.estimate_id → estimates.id
- Verification: Provide the result sets or summarized screenshots. I’ll map to our Zod types and flag discrepancies.

### Step 2 — Type-Safe Contracts Alignment
- Objective: Align Zod schemas and tRPC output types to DB reality.
- Actions:
  - Compare src/lib/api/domains/estimates/types.ts (and other domains) against Step 1 inventory.
  - Add missing fields (e.g., updated_at, created_by_employee_id) to Zod where applicable.
  - Ensure enums (status, type) mirror DB constraints.
  - Ensure all tRPC routers .output() match Zod schemas and include ownership checks (already present for estimates).
- Verification: Share diffs of changed Zod schemas and router outputs. I’ll review for completeness and correctness.

### Step 3 — Skeleton Read APIs
- Objective: Introduce a single claim.getSkeletonById and optional claim.getSkeletonDelta.
- Actions:
  - Define ClaimSkeleton shape (see PRD section 5) in Zod for strict typing.
  - Implement claim.getSkeletonById: select scoped, RLS-safe data across entities; include versions {updated_at timestamps per entity type}.
  - Implement claim.getSkeletonDelta({ id, sinceVersion }): return only changed slices + new versions.
- Verification:
  - Call getSkeletonById for a known claim; confirm all slices present and ids belong to that claim.
  - Call getSkeletonDelta with a sinceVersion before/after edits; confirm minimal payload.

### Step 4 — SSR Hydration with Single Key
- Objective: Replace scattered prefetches with one skeleton prefetch.
- Actions:
  - In claim page server component, prefetch claim.getSkeletonById(claimId) and hydrate React Query under ['claimSkeleton', claimId].
  - Remove parallel domain prefetches for initial render (estimates/lines) to avoid duplicate sources; keep optional lazy prefetch after paint.
- Verification: Navigate to a claim; React Query Devtools should show only ['claimSkeleton', claimId] for initial data. No cross-claim bleed on navigation.

### Step 5 — ClaimSessionStore (Normalized)
- Objective: Centralize client state for the active claim.
- Actions:
  - Create ClaimSessionStore with entities {claims, estimates, estimateLines, photos, inspections, costings}, indexes.byClaimId, session {currentClaimId, lastActivityTime, syncStatus}.
  - Add initializeClaimSession(claimId, skeleton) to normalize and populate store.
  - Add selectors (by claim/estimate) and utility getters (totals, dirty lines).
  - Migrate estimateSessionStore slice into this store; keep backward-compatible selectors temporarily for UI.
- Verification: After mount, store contains normalized entities; derived selectors feed UI without further queries.

### Step 6 — Single Change Journal + Sync Worker
- Objective: Unify optimistic updates and background sync.
- Actions:
  - Define journal entry format: { id, claimId, entityType, op, entityId|tempId, payload, createdAt, attempt, lastError, version }.
  - Implement enqueueOp(), dequeueOnSuccess(), markFailedWithBackoff().
  - Implement Sync Worker: processes queue; maps entityType/op → DAL mutations (estimateLine.create/update/delete, etc.); handles tempId → realId swaps.
  - Integrate online/offline detection and canSync guard; persist journal + store in IndexedDB.
- Verification: Edit a line offline → queued; come online → ops flush; confirm server rows updated and local store reconciled.

### Step 7 — Conflict Detection & Merge Policies
- Objective: Prevent silent overwrites; merge sanely.
- Actions:
  - Use updated_at/version in all entity reads; include If-Match/If-Unmodified-Since or equivalent optimistic concurrency at tRPC/server layer.
  - Implement merge strategies:
    - Primitive fields: last-write-wins by default (configurable).
    - Collections: id-based reconcile; keep client inserts absent on server.
  - Surface conflicts with UI notifications; keep both versions for user choice when needed.
- Verification: Simulate concurrent edit (two tabs). Ensure user sees conflict and resolution path; no data loss.

### Step 8 — Caching & Invalidation Discipline
- Objective: One source of truth per claim; predictable invalidations.
- Actions:
  - Read UI state from ClaimSessionStore; use skeleton cache only for refresh/rehydration.
  - On claim change, reset ClaimSessionStore and invalidate ['claimSkeleton', prevClaimId].
  - On successful sync, patch skeleton cache with setQueryData to keep SSR parity.
- Verification: Switch rapidly between multiple claims; ensure no stale bleed and correct rehydration.

### Step 9 — Security & RLS Validation
- Objective: Enforce strict claim ownership and least privilege.
- Actions:
  - Verify Supabase RLS policies for each table ensure created_by_employee_id matches current user via JWT.
  - Confirm all routers do ownership checks (already present in estimates router) before returning data.
- Verification: Attempt to access another user’s claim id; expect NOT_FOUND/denied.

### Step 10 — Observability & Debugging
- Objective: Make the engine inspectable.
- Actions:
  - Add structured logs (claimId, entityType, op, attempt, ms, outcome) for prefetch, hydrate, enqueue, sync, conflict, resolve.
  - Add a small Debug Panel showing: pendingOps, lastSyncTime, dirty counts per entity.
- Verification: Use panel + logs to track edits through to server persistence.

### Step 11 — Test Plan (Happy + Edge Cases)
- Happy paths: open claim, edit lines, add/remove items, navigate across claims, offline/online replay, SSR to client parity.
- Edge cases: very large line sets, photo-heavy claims, network flaps, server conflicts, tempId collisions, cross-tab edits.
- Artifacts to share for review: screenshots of Devtools, logs, SELECT counts from server, and before/after snapshots of store.

### How to Request Verification from Me
- After completing a step, send:
  - A short description of changes
  - Relevant code diffs (or file/line references)
  - Runtime evidence (logs/screens/devtools screenshots)
  - For DB-related steps, the SQL outputs (read-only) you ran
- I’ll review and give pass/fail with concrete next fixes.


## 17. Dev Mode Overlay (Using Temp User, Safe-by-Design)

Purpose: enable fast development with a temporary user while preserving type-safety and claim isolation. This section documents flags, guardrails, and how to harden later without code churn.

### 17.1 Env & Config
- Env vars (server-safe defaults):
  - NEXT_PUBLIC_APP_ENV=development
  - DEV_MODE=true
  - DEV_TEMP_USER_ID=<uuid of temp dev user>
- Central config module (e.g., src/config/appEnv.ts):
  - export const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development' || process.env.DEV_MODE === 'true'
  - export const DEV_TEMP_USER_ID = process.env.DEV_TEMP_USER_ID

### 17.2 Auth Behavior (Server)
- tRPC context user resolution:
  - If isDev && no auth user present, inject ctx.user.id = DEV_TEMP_USER_ID to pass ownership checks.
  - Log a clear banner when dev injection is used.
- Seed dev data so claims/estimates are owned by DEV_TEMP_USER_ID.

### 17.3 RLS Posture in Dev
- Keep existing permissive policies acceptable during dev, but:
  - NEVER expose service role key client-side.
  - All client calls go through tRPC; server holds keys and applies ownership checks.
- Prepare production-ready policies now (documented in Step 9), but enable them later with a rollout flag.

### 17.4 Type Safety (Same in Dev & Prod)
- Zod schemas consistently enforce:
  - uuid: z.string().uuid()
  - numeric: z.coerce.number() (or parse on server then z.number())
  - enums: z.enum([...]) exactly matching DB literals (e.g., claim_status_enum)
  - timestamps: z.string().datetime() (or Date on server), include created_at/updated_at
- This parity ensures no surprises when tightening security later.

### 17.5 Client Isolation Still Enforced
- ClaimSessionStore must reset on claim change and validate (currentClaimId, currentEstimateId) on mutations.
- Single cache key ['claimSkeleton', claimId] for SSR hydration; no legacy parallel keys on initial load.

### 17.6 Sync Engine in Dev
- Start with last-write-wins; log updated_at/version on every op.
- Full-graph skeleton fetch acceptable initially; delta sync added later.
- Offline queue enabled; verbose logs to validate replay.

### 17.7 Hardening Path (Flip to Strict)
- Turn off DEV_MODE; require real auth user.
- Enforce strict RLS (remove anon INSERT/UPDATE/DELETE; restrict SELECT to owner-scope predicates).
- Enable optimistic concurrency: If-Match/If-Unmodified-Since or server-side version checks; surface conflicts.
- Reduce logs to info/warn and remove dev banners.

### 17.8 Verification Checklist (Dev)
- Opening a claim without an auth login uses DEV_TEMP_USER_ID and returns only owned data.
- Navigating between claims never leaks data.
- Numeric fields parse as numbers; enums match exactly; uuids are valid.
- Background sync replays queued ops after offline and updates server rows correctly.
- No service role keys present client-side.


## 18. Task Tracker (Progress + Verification)

Use this checklist to implement and verify each milestone. After you complete a task, provide the “Verification artifacts” so I can confirm.

- [x] T1: Database schema inventory (read-only, CPA)
  - What to do: Run introspection queries (tables, columns, FKs, enums, RLS) and archive outputs.
  - Verification artifacts: Query outputs or screenshots; brief summary of key relationships and enums.

- [ ] T2: Align Zod/tRPC types to DB (type-safe flow)
  - What to do: Update Zod enums to match DB; coerce numeric; include created_at/updated_at; uuid validation across domains.
  - Verification artifacts: Diff of updated Zod and router outputs; one example response showing numbers as numbers and enums matching.

- [ ] T3: Implement claim.getSkeletonById (tRPC) + Zod ClaimSkeleton
  - What to do: Add server endpoint returning normalized skeleton (claim, estimate, lines, inspections, attachments, versions).
  - Verification artifacts: Example payload for a real claim; proof IDs all belong to claim; Zod parse success.

- [ ] T4: SSR hydrate single key ['claimSkeleton', claimId]
  - What to do: Replace scattered prefetches; hydrate one key; remove parallel initial domain queries.
  - Verification artifacts: React Query Devtools screenshot showing only skeleton key on initial render; logs showing claim transitions cleanly.

- [ ] T5: Create ClaimSessionStore and initialize from skeleton
  - What to do: Normalized entities, indexes.byClaimId, session; initializeClaimSession(claimId, skeleton); migrate estimate slice.
  - Verification artifacts: Store snapshot (sanitized) after mount; UI selectors rendering without extra queries.

- [ ] T6: Single Change Journal + Sync Worker (dev LWW)
  - What to do: Journal format; enqueue/flush; tempId→realId; offline replay; verbose logs.
  - Verification artifacts: Logs of queued ops and successful replay; server rows updated; local store reconciled.

- [ ] T7: Conflict detection scaffolding
  - What to do: Capture updated_at/version; on mismatch, log conflict and keep client edit pending; no silent overwrite.
  - Verification artifacts: Simulated conflict logs; screenshot of user notification; journal entry remains until resolved.

- [ ] T8: Caching & invalidation discipline
  - What to do: Read from store; use skeleton cache for refresh; reset on claim change; patch cache on sync success.
  - Verification artifacts: Rapid claim switching video/screenshot; no cross-claim bleed; correct rehydration.

- [ ] T9: Dev Mode overlay (temp user) wired
  - What to do: Env flags; tRPC ctx temp user injection (dev only); log banner; ensure no service role in client.
  - Verification artifacts: Log banner screenshot; request headers/tokens redacted; proof of temp user ownership in responses.

- [ ] T10: Observability & Debug Panel
  - What to do: Structured logs; small panel showing pendingOps, lastSync, dirty counts.
  - Verification artifacts: Panel screenshot; sample structured logs.

- [ ] T11: Execute test plan (happy + edge)
  - What to do: Run scenarios from Section 16 Step 11; document outcomes.
  - Verification artifacts: Screens/devtools screenshots; server SELECTs before/after; store snapshots; notes on any regressions.

- [ ] T12: RLS hardening plan prepared (not applied yet)
  - What to do: Draft strict policies for prod (owner-scoped SELECT/UPDATE/DELETE; no anon writes); document rollout.
  - Verification artifacts: SQL policy drafts; review notes mapping each table to its predicate.
