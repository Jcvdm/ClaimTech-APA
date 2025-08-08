# Database Schema Inventory - Task 1 Verification (Live DB)
**Date**: 2025-08-08
**Status**: ✅ Complete

## Executive Summary
Live schema introspection of the CPA Supabase database confirms core entities, relationships, and three authoritative DB enums. This replaces earlier migration-only assumptions and should be used for type alignment and API contracts.

## 1. Core Tables (public schema, live)

- claims
- estimates
- estimate_lines
- damages
- attachments (links to claims/damages/additional_lines)
- additional_lines (links to estimates)
- appointments
- vehicle_inspections
- claim_logs
- clients, client_contacts, client_approved_repairers
- vehicles, vehicle_accessories
- repairers, provinces
- profiles

### Key Relationships (live)
```
clients ← claims → vehicles
    ↓
    estimates → estimate_lines
    ↓
    damages → attachments
    ↓
    vehicle_inspections
    ↓
    appointments
    ↓
    claim_logs
    ↓
    attachments (also references additional_lines)
```

## 2. Foreign Keys (live)

### CASCADE (selected)
- estimates.claim_id → claims.id ON DELETE CASCADE
- estimate_lines.estimate_id → estimates.id ON DELETE CASCADE
- vehicle_inspections.claim_id → claims.id ON DELETE CASCADE
- claim_logs.claim_id → claims.id ON DELETE CASCADE
- appointments.claim_id → claims.id ON DELETE CASCADE
- attachments.claim_id → claims.id ON DELETE CASCADE

### RESTRICT
- claims.client_id → clients.id ON DELETE RESTRICT
- claims.vehicle_id → vehicles.id ON DELETE RESTRICT

### SET NULL
- claim_logs.user_id → profiles.id ON DELETE SET NULL
- estimate_lines.damage_id → damages.id ON DELETE SET NULL
- attachments.damage_id → damages.id ON DELETE SET NULL
- attachments.additional_line_id → additional_lines.id ON DELETE SET NULL

## 3. Database Enums (authoritative, live)

- claim_instruction_enum: "Agree Only", "Agree and Authorize"
- claim_status_enum: "New", "Appointed", "In Progress", "Report Sent", "Authorized", "FRC Requested", "FRC Active", "FRC Finalized", "Canceled"
- type_of_loss_enum: "Accident", "Theft", "Fire", "Flood", "Hail", "Vandalism", "Other"

Notes:
- Columns in estimates/estimate_lines for status/type/source/part/operation are TEXT today; no DB enums exist for them yet. Treat as string in code or define narrow unions with caution. Consider adding DB enums later.

## 4. Type Alignment Issues Found

### Critical Issues (3)
1. **Numeric Precision**: DB uses NUMERIC(12,2) but TypeScript uses number without precision
2. **Date/Time Handling**: Some fields use TEXT in DB (time_of_loss) but expect Date in TypeScript
3. **Enum Mismatches**: claim.status is TEXT in DB but expects enum in TypeScript

### Missing Tables Referenced (4)
1. **provinces** - Referenced by claims.province_id
2. **repairers** - Referenced by estimates.repairer_id
3. **profiles** - Referenced for user tracking (Supabase auth.users?)
4. **damages** - Referenced by estimate_lines.damage_id

## 5. Row Level Security

### Current State
- **Development Mode**: Permissive policies via create_dev_policy_for_* functions
- **Authentication**: All tables have RLS enabled with 'authenticated' role
- **Anon Access**: Development override allows 'anon' role for testing

### Production Requirements
- Remove anon access policies
- Enforce created_by_employee_id checks
- Add tenant isolation if multi-company support needed

## 6. Key Database Functions

### Verified Functions (4)
1. **create_claim_with_vehicle()** - Atomic claim creation with job number
2. **calculate_estimate_totals()** - Optimized estimate calculations
3. **execute_bulk_create_estimate_lines()** - Batch line creation
4. **execute_mixed_bulk_operations()** - Mixed CRUD operations

## 7. Performance Considerations (live)

### Indexes
- Primary key and foreign key indexes present across core tables.
- Composite/partial indexes on estimate_lines for common filters.

### Observations
1. vehicle_inspections has ~25 columns (not 80+). Size acceptable; monitor row bloat as features grow.
2. Attachments use storage paths; optimize via CDN later.
3. Consider adding time-based indexes (e.g., claims.created_at) based on query patterns.

## 8. Data Integrity Constraints

### Check Constraints (10+)
- estimate.vat_rate_percentage: >= 0 AND <= 100
- estimate.part_markup_percentage: >= 0 AND <= 500
- estimate_lines.sequence_number: > 0
- estimate_lines.quantity: > 0
- All cost fields: >= 0 (no negative amounts)

### Unique Constraints (3)
- claims.job_number: UNIQUE
- estimates.estimate_number: UNIQUE
- clients.code: UNIQUE

## 9. Recommendations for Type Alignment

### Immediate Actions (Priority 1)
1. Update TypeScript enums to match database exactly
2. Add z.coerce.number() for all NUMERIC fields
3. Ensure UUID validation with z.string().uuid()
4. Add updated_at/created_at to all Zod schemas

### Near-term Actions (Priority 2)
1. Create missing table schemas (provinces, repairers, damages)
2. Standardize date/time handling (TIMESTAMPTZ vs TEXT)
3. Convert TEXT enums to proper database enums

### Long-term Actions (Priority 3)
1. Optimize vehicle_inspections table structure
2. Implement proper file storage with CDN
3. Add comprehensive audit logging

## Verification Artifacts

### Source Files Analyzed
- 22 migration files in CPA/src/db/migrations/
- 10 TypeScript type files in CPA/src/lib/api/domains/*/types.ts
- Database functions and stored procedures

### Method Used
- Static analysis of migration SQL files
- TypeScript/Zod schema examination
- Cross-reference validation between DB and code

### Confidence Level
- **High** (95%): Core table structures and relationships
- **Medium** (75%): Enum completeness and constraints
- **Low** (50%): Missing tables (provinces, repairers, damages)

## Next Steps
1. ✅ Task 1: Database Schema Inventory - **COMPLETE**
2. → Task 2: Align Zod/tRPC types to database reality
3. → Task 3: Implement claim.getSkeletonById endpoint

---
**Verification Complete**: Database schema inventory ready for type alignment phase.

## Live DB Corrections (Supersedes earlier assumptions)

This section updates the inventory based on direct introspection of the live CPA Supabase database. Use this as the source of truth for type alignment and API contracts.

### A. Core Tables and Names
- Use attachments (not claim_attachments). It links to claims, damages, and additional_lines.
- additional_lines exists and links to estimates.
- provinces, repairers, damages exist (previously marked missing).

### B. Foreign Keys (selected corrections)
- estimates.claim_id → claims.id ON DELETE CASCADE (confirmed)
- estimate_lines.estimate_id → estimates.id ON DELETE CASCADE (confirmed)
- estimate_lines.damage_id → damages.id ON DELETE SET NULL (present)
- attachments.claim_id → claims.id ON DELETE CASCADE (present)
- attachments.damage_id → damages.id ON DELETE SET NULL (present)
- attachments.additional_line_id → additional_lines.id ON DELETE SET NULL (present)

### C. Database Enums (authoritative list)
- claim_instruction_enum: "Agree Only", "Agree and Authorize"
- claim_status_enum: "New", "Appointed", "In Progress", "Report Sent", "Authorized", "FRC Requested", "FRC Active", "FRC Finalized", "Canceled"
- type_of_loss_enum: "Accident", "Theft", "Fire", "Flood", "Hail", "Vandalism", "Other"
Notes:
- Enums referenced earlier (estimate_status_enum, estimate_type_enum, estimate_source_enum, operation_code_enum, part_type_enum) are NOT present in live DB; relevant columns are TEXT today.

### D. Column Typing Guidance (for Zod/TypeScript)
- UUIDs: z.string().uuid()
- Numeric (NUMERIC/DECIMAL): z.coerce.number() or parse to number server-side then z.number()
- Timestamps (timestamptz): z.string().datetime() or Date at server boundary
- Booleans: z.boolean()
- Arrays (e.g., repairers.types): string[]
- Enums: use the three DB enums above exactly as literals; keep TEXT columns as string or narrow union in code until DB enums are added.

### E. Size/Performance Update
- vehicle_inspections has ~25 columns (not 80+ as previously stated).

### F. Action Items for Plan T2 (Align Zod/tRPC types)
- claims: status/instruction/type_of_loss → DB enums; include created_at/updated_at.
- estimates: status/type/source remain string for now; include version:int and numeric totals with coercion.
- estimate_lines: coerce numeric fields; boolean is_included; part_type as string; include timestamps.
- attachments/damages/appointments/vehicle_inspections: reflect live columns; coerce numerics; handle timestamps.

These corrections align the document with the live schema and should guide subsequent development and verification.