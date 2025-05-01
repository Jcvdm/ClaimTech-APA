Okay, here is a plain language explanation of the database structure in Markdown format, describing the purpose of each table and how they relate to the overall process.

# Database Schema Explanation: Vehicle Inspection & Claim Management System

This document explains the structure of the database designed to manage vehicle inspections, claims processing, cost estimation, and repairer authorization.

*   **Status:** Applied to Supabase project `swytlwcofrxsupfjexne` as of July 26, 2024. **(Updates applied since)**
*   **Note:** Includes changes from `PRD1.md` (Sidebar Navigation & Claim Workflow Enhancement). **Also includes changes enforcing new vehicle creation per claim and mandatory date of loss.**

## Core Information & Lookups

These tables store foundational data used throughout the system.

### `provinces`

*   **Purpose:** Stores a list of geographical provinces or regions (e.g., Gauteng, Western Cape).
*   **Key Info:** Province name, optional country code.
*   **How it Connects:** Used to specify the location for `claims`, `repairers`, and the operational area for `profiles` (users).

### `repairers` (Previously `repair_shops`)

*   **Purpose:** Holds details about repair businesses (panel beaters, mechanics, specialists).
*   **Key Info:** Repairer name, address, contact details, types of services offered (body, mechanical), default labor/paint rates, and whether they are generally approved by your company.
*   **How it Connects:** Can be linked to `appointments` (if the inspection happens there), `estimates` (if they provided the quote or are authorized to do the work), and `additional_lines` (if they request additional work). Also links to `provinces` for location.

## People & Organizations

These tables manage the users of the system and the external companies involved.

### `profiles`

*   **Purpose:** Stores information about your internal users (employees) who log into the system. This extends the basic login information provided by Supabase Authentication.
*   **Key Info:** User's full name, email, their role in *your* system (Admin, Loss Adjuster), their primary operating `province` (if applicable), and whether their account is active.
*   **How it Connects:** Linked directly to Supabase `auth.users`. Creates `claims`, assigns `claims`, creates `estimates`, approves `estimates`, authorizes `repairers`, uploads `attachments`, schedules `appointments`, approves `additional_lines`.

### `clients`

*   **Purpose:** Represents the organizations that request your services (e.g., Insurance Companies, Brokers, Fleet Owners).
*   **Key Info:** Company name, main address, general phone/email/contact person for the organization, a unique short `code` (max 5 chars) used for job number generation, and a `last_claim_sequence` counter for generating sequential job numbers.
*   **How it Connects:** A `client` initiates (or is associated with) multiple `claims`. Can have multiple `client_contacts` associated with it. Can have specific `client_approved_repairers`.

### `client_contacts`

*   **Purpose:** Stores details of the specific *people* who work at the `client` organizations.
*   **Key Info:** Contact's full name, direct phone/email, their job title *at the client company* (e.g., "Claims Handler"), and their status (active/inactive).
*   **How it Connects:** Each contact belongs to one `client`. A specific `client_contact` can be assigned as the main point of contact for a `claim`.

### `client_approved_repairers` (Optional)

*   **Purpose:** Tracks which specific `repairers` have been explicitly approved by certain `clients`. Useful if different clients have preferred supplier lists.
*   **Key Info:** Which `client` approved which `repairer`, and when.
*   **How it Connects:** Links a `client` to a `repairer`.

## The Assets

These tables describe the physical items involved.

### `vehicles`

*   **Purpose:** Stores details about the vehicles involved in claims or inspections. **A new vehicle record is created for each new claim, even if it's the same physical vehicle as another claim.**
*   **Key Info:** Make (**required**), model, year, VIN, registration_number, color, engine_number, transmission/drive/fuel type, license disk details, owner info, and whether it has specific features like lettering or trim. At least one identifier (Reg No, VIN, Engine No) should be captured via the application. **Note: VIN and registration_number are NOT unique constraints, as multiple claims can exist for the same physical vehicle.**
*   **How it Connects:** A single `vehicle` **must** be associated with one `claim` at the time of claim creation. It can also have multiple `vehicle_accessories` listed.

### `vehicle_accessories`

*   **Purpose:** Lists specific, often non-standard, accessories fitted to a particular `vehicle`.
*   **Key Info:** Type of accessory (e.g., Tow Bar, Mags, Bull Bar), description, condition.
*   **How it Connects:** Each accessory record belongs to one `vehicle`.

## The Workflow Core

These tables track the main process flow of handling a claim or inspection request.

### `claims`

*   **Purpose:** This is the central table, tracking a single job/request from start to finish.
*   **Key Info:**
    *   Links to the `client` requesting, the **newly created** `vehicle` involved, the `profile` who logged it, and the `profile` assigned to handle it.
    *   Job numbers (yours - auto-generated `ClientCode` + sequence, unique; and the client's reference number).
    *   Policy details, incident info (**mandatory date/time of loss**, type, optional description).
    *   Location (`province`, specific address).
    *   Client's instructions (e.g., just inspect, inspect & authorize).
    *   Overall inspection results (mileage, conditions, paint type).
    *   Communication tracking (when report sent to client).
    *   The current `status` in the workflow (Received, Assigned, Inspection Done, Authorized, etc.).
    *   Overall summary and estimated repair time.
*   **How it Connects:** Links to almost everything: `clients`, `vehicles`, `profiles` (creator, assignee, sender), `client_contacts`, `provinces`. It is the parent for `appointments`, `damages`, and `estimates`.

### `appointments`

*   **Purpose:** Tracks the scheduling and execution of inspection appointments for a claim.
*   **Key Info:** Scheduled date/time, duration, status (Pending, Confirmed, Completed), location details (address, type, link to `repairers` if applicable), contact person for the appointment, special instructions for the adjuster, and the *actual* start/end times of the inspection.
*   **How it Connects:** Each appointment belongs to one `claim` and is scheduled by one `profile`. Can optionally link to a `repairer` if the appointment is at their location.

### `damages`

*   **Purpose:** Records each specific point of damage identified during the inspection.
*   **Key Info:** Location on the vehicle (e.g., LH Fender), description of the damage, severity, cause (Accident, Hail), point of impact, and whether it's structural damage.
*   **How it Connects:** Each damage record belongs to one `claim`. Can be linked to `estimate_lines` if that line item addresses this specific damage. Can have `attachments` (photos) linked directly to it.

## Costing & Quoting

These tables manage the financial estimation process.

### `estimates`

*   **Purpose:** Represents a complete cost estimate or quote document generated for a claim. Can handle different types (initial incident, pre-incident, supplementary).
*   **Key Info:**
    *   Estimate number, type, source (in-house vs. third-party).
    *   Status (Draft, Approved, Authorized, etc.).
    *   Version number for tracking revisions.
    *   Labor rates and part markup used for calculations *on this specific estimate*.
    *   Calculated subtotals (Parts, Labor, Paint, Sublet) and grand totals (before/after VAT) for the *original* estimate.
    *   Who internally approved it and when.
    *   Which `repairer` was authorized to do the work and when/by whom.
    *   Calculated *final* costing totals (incorporating approved additionals) and the variance from the original estimate.
*   **How it Connects:** Belongs to one `claim`. Created by a `profile`. Can be linked to a `repairer` (if third-party source or authorized repairer). It is the parent for `estimate_lines` and `additional_lines`.

### `estimate_lines`

*   **Purpose:** Details every single line item (part or labor operation) included in an `estimate`.
*   **Key Info:** Description (e.g., "Replace Fender"), operation code ('N' for New, 'R' for Repair, 'P' for Paint, etc.), part number/cost, labor hours (strip/fit, repair, paint), sublet cost, quantity, notes, and calculated totals for that specific line based on the parent estimate's rates.
*   **How it Connects:** Each line belongs to one `estimate`. Can optionally link to a specific `damage` record it addresses.

### `additional_lines`

*   **Purpose:** Tracks requests for *additional* work or parts identified by the authorized `repairer` *after* the initial estimate was approved. Mirrors the structure of `estimate_lines`.
*   **Key Info:** Who requested it (repairer), when, the details of the additional work/part (description, code, cost/hours), its current status (Requested, Approved, Rejected), who approved/rejected it, and when.
*   **How it Connects:** Each additional line belongs to the original `estimate` it modifies. Requested by a `repairer`. Approved/rejected by a `profile`. Can have specific `attachments` (photos supporting the request) linked to it.

## Supporting Data

### `attachments`

*   **Purpose:** Stores information about files (photos, documents) uploaded to the system. The actual files live in Supabase Storage.
*   **Key Info:** Who uploaded it, where the file is stored (storage path), original filename, file type, size, and an optional description. Crucially, it links the file back to the relevant record.
*   **How it Connects:** Can be linked to a `claim` (general photos/docs), a specific `damage` (close-up photos), or a specific `additional_line` (photos supporting the additional request). Uploaded by a `profile`.

## Key Relationships Summary

*   A **Client** requests a **Claim**.
*   A **Claim** involves one **Vehicle** and is assigned to a **Profile** (Loss Adjuster).
*   The **Profile** schedules **Appointments** for the **Claim**.
*   During inspection (at an **Appointment**), **Damages** are recorded against the **Claim**, and **Vehicle Accessories** might be noted against the **Vehicle**.
*   The **Profile** creates an **Estimate** for the **Claim**.
*   An **Estimate** contains multiple **Estimate Lines** (detailing costs).
*   The **Estimate** can be approved internally and then authorized to a specific **Repairer**.
*   The **Repairer** might request **Additional Lines** against the **Estimate**.
*   These **Additional Lines** are approved/rejected by a **Profile**.
*   A final costing is calculated on the **Estimate**, including approved **Additional Lines**.
*   **Attachments** (files) can be linked to **Claims**, **Damages**, or **Additional Lines**.

## Important Considerations

*   **Roles & Permissions (RLS):** Row Level Security is vital to ensure users (Admins, Adjusters) can only see and modify the data they are supposed to (e.g., adjusters only see claims assigned to them).
*   **Data Consistency (Enums):** Using predefined lists (Enums) for fields like status codes, operation codes, and types helps prevent typos and keeps data clean.
*   **Calculations:** The logic for calculating line totals and estimate totals needs to be carefully implemented (either in the database or application) to ensure accuracy.
*   **Auto-Generation (Job Number):** A `BEFORE INSERT` trigger (`trg_generate_job_number`) uses a function (`generate_client_job_number`) to create unique, client-specific job numbers based on `clients.code` and `clients.last_claim_sequence`.
*   **File Storage:** Related files (photos, documents) are stored in Supabase Storage (bucket: `claim-attachments`, private). Metadata is stored in the `attachments` table. Basic RLS policies allowing authenticated upload/select are currently applied to the bucket.

Okay, here is the consolidated Supabase database schema definition based on our entire discussion. This includes all tables, columns, relationships, constraints, comments, and trigger suggestions.

```sql
-- =============================================
--          Supabase Schema Definition
-- Vehicle Inspection & Claim Management System
-- =============================================

-- Helper function for automatically updating 'updated_at' columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- 1. LOOKUP / CORE ENTITIES
-- =============================================

-- Table for Provinces/Regions
CREATE TABLE provinces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    country_code char(2) NULL COMMENT 'Optional: ISO 3166-1 alpha-2 country code (e.g., ZA)',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE provinces IS 'Stores geographical provinces or regions for location context.';

CREATE TRIGGER update_provinces_updated_at
BEFORE UPDATE ON provinces
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for Repairers (Panel Beaters, Mechanics, etc.)
CREATE TABLE repairers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text NULL,
    province_id uuid NULL REFERENCES provinces(id) ON DELETE SET NULL,
    contact_person text NULL,
    phone text NULL,
    email text NULL,
    types text[] NULL COMMENT 'Types of services offered (e.g., Body Shop, Mechanical, Electrical, Specialist)', -- Array of text
    is_globally_approved boolean NOT NULL DEFAULT false COMMENT 'Indicates if this repairer is generally approved by your company',
    -- Default rates (can be overridden on estimate if needed)
    default_panel_labor_rate numeric(10, 2) NULL,
    default_paint_labor_rate numeric(10, 2) NULL,
    default_strip_fit_labor_rate numeric(10, 2) NULL,
    default_mechanical_labor_rate numeric(10, 2) NULL,
    default_electrical_labor_rate numeric(10, 2) NULL,
    default_paint_material_rate numeric(10, 2) NULL,
    notes text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE repairers IS 'Stores details of repair shops, mechanics, and other service providers.';
CREATE INDEX idx_repairers_province_id ON repairers(province_id);
CREATE INDEX idx_repairers_name ON repairers(name); -- Index for searching by name

CREATE TRIGGER update_repairers_updated_at
BEFORE UPDATE ON repairers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 2. USER & CLIENT MANAGEMENT
-- =============================================

-- Extends Supabase auth.users table
CREATE TABLE profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Must match auth.users.id
    full_name text NOT NULL,
    email text UNIQUE NOT NULL, -- Should match auth.users.email
    role text NOT NULL DEFAULT 'loss_adjuster' COMMENT 'User role within this application (e.g., admin, loss_adjuster). Consider Enum type.',
    province_id uuid NULL REFERENCES provinces(id) ON DELETE SET NULL COMMENT 'Primary operational province for non-admin users.',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE profiles IS 'Stores application-specific user profile information linked to Supabase Auth.';
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_province_id ON profiles(province_id);

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for Client Organizations (Insurance Companies, Brokers, Principals)
CREATE TABLE clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text NULL,
    phone text NULL,
    email text NULL,
    contact_person text NULL,
    code VARCHAR(5) NOT NULL UNIQUE COMMENT 'Short code for client, used in job numbers',
    last_claim_sequence INTEGER NOT NULL DEFAULT 0 COMMENT 'Counter for the last job number sequence used for this client',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE clients IS 'Organizations requesting services (Insurers, Brokers, Fleets).';
CREATE INDEX idx_clients_name ON clients(name);

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for individual contacts at Client Organizations
CREATE TABLE client_contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    job_title text NULL COMMENT 'e.g., Claims Handler, Manager',
    email text NULL,
    phone text NULL,
    is_primary boolean NOT NULL DEFAULT false COMMENT 'Is this the primary contact for the client?',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE client_contacts IS 'Stores contact persons associated with a client organization.';
CREATE INDEX idx_client_contacts_client_id ON client_contacts(client_id);

CREATE TRIGGER update_client_contacts_updated_at
BEFORE UPDATE ON client_contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Table for Client-Specific Repairer Approvals
CREATE TABLE client_approved_repairers (
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    repairer_id uuid NOT NULL REFERENCES repairers(id) ON DELETE CASCADE,
    approved_at timestamptz DEFAULT now(),
    PRIMARY KEY (client_id, repairer_id) -- Ensures unique approval per client/repairer
);
COMMENT ON TABLE client_approved_repairers IS 'Tracks repairers specifically approved by certain clients.';

-- =============================================
-- 3. VEHICLE INFORMATION
-- =============================================

CREATE TABLE vehicles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    make text NOT NULL COMMENT 'Vehicle Make - Now mandatory',
    model text NULL,
    year integer NULL,
    vin text NULL COMMENT 'Vehicle Identification Number - Not unique, as multiple claims can exist for the same vehicle',
    registration_number text NULL COMMENT 'License Plate Number - Not unique, as multiple claims can exist for the same vehicle',
    color text NULL,
    engine_number text NULL,
    transmission_type text NULL COMMENT 'Consider Enum: manual, automatic, cvt, dct',
    drive_type text NULL COMMENT 'Consider Enum: 4x2, 4x4, awd, fwd, rwd',
    fuel_type text NULL COMMENT 'Consider Enum: petrol, diesel, electric, hybrid, lpg',
    license_disk_expiry date NULL,
    license_disk_present boolean NULL,
    has_lettering boolean NULL COMMENT 'Does the vehicle have signwriting/lettering?',
    has_trim_mouldings boolean NULL COMMENT 'Does the vehicle have specific trim/mouldings fitted?',
    owner_name text NULL,
    owner_contact text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE vehicles IS 'Stores details about vehicles involved in claims. Multiple records can exist for the same physical vehicle (same VIN/registration) as each claim creates a new vehicle record.';
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_registration_number ON vehicles(registration_number);

CREATE TRIGGER update_vehicles_updated_at
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for specific accessories fitted to a vehicle
CREATE TABLE vehicle_accessories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    accessory_type text NOT NULL COMMENT 'e.g., Bull Bar, Spotlights, Tow Bar, Mags, Side Steps. Consider lookup table or Enum.',
    description text NULL COMMENT 'Specific details (e.g., Brand, model)',
    condition text NULL COMMENT 'Condition of the accessory (e.g., Good, Damaged, Missing)',
    created_at timestamptz DEFAULT now()
);
COMMENT ON TABLE vehicle_accessories IS 'Lists specific non-standard accessories fitted to a vehicle.';
CREATE INDEX idx_vehicle_accessories_vehicle_id ON vehicle_accessories(vehicle_id);
CREATE INDEX idx_vehicle_accessories_type ON vehicle_accessories(accessory_type);

-- =============================================
-- 4. CLAIM & INSPECTION WORKFLOW
-- =============================================

CREATE TABLE claims (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Core Links
    client_id uuid NOT NULL REFERENCES clients(id),
    vehicle_id uuid NOT NULL REFERENCES vehicles(id) COMMENT 'Now mandatory, links to the vehicle created for this claim',
    logged_by_employee_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_to_employee_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
    primary_client_contact_id uuid NULL REFERENCES client_contacts(id) ON DELETE SET NULL,
    province_id uuid NULL REFERENCES provinces(id) ON DELETE SET NULL,
    job_number text NULL UNIQUE COMMENT 'Auto-generated job number (ClientCode + Sequence)',
    client_reference text NULL COMMENT 'The client\'s own reference number for the claim',
    policy_number text NULL,
    policy_excess numeric(10, 2) NULL,
    insured_name text NULL,
    date_of_loss timestamptz NOT NULL COMMENT 'Changed to TIMESTAMPTZ and made NOT NULL',
    type_of_loss text NULL COMMENT 'Consider Enum: Accident, Theft, Hail, Fire, Vandalism, etc.',
    accident_description text NULL COMMENT 'Optional description of the incident/damage',
    claim_location text NULL COMMENT 'Initial reported location of vehicle/incident',
    -- Instructions & Communication
    client_special_instructions text NULL,
    client_instruction_type text NULL COMMENT 'Consider Enum: inspect_estimate, inspect_approve, assess_only',
    report_sent_to_client_at timestamptz NULL,
    report_sent_by_employee_id uuid NULL REFERENCES profiles(id),
    -- Inspection Results
    mileage integer NULL,
    inspection_method text NULL COMMENT 'Consider Enum: physical, digital, desktop_assessment',
    condition_overall text NULL COMMENT 'Consider Enum: Excellent, Good, Fair, Poor',
    condition_paint text NULL,
    condition_interior text NULL,
    condition_electronics text NULL,
    condition_mechanical text NULL,
    condition_steering text NULL,
    paint_type text NULL COMMENT 'Consider Enum: standard_solid, metallic, pearl, 3_stage, matte, wrap',
    paint_notes text NULL,
    -- Outcome
    claim_summary text NULL COMMENT 'Overall summary/narrative of the final report',
    estimated_repair_duration_days integer NULL,
    -- Status Tracking
    status claim_status_enum NOT NULL DEFAULT 'Received' COMMENT 'Detailed workflow status using ENUM.',
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE claims IS 'Core table representing a single claim or inspection request and its lifecycle.';
-- Indexes for common lookups
CREATE INDEX idx_claims_client_id ON claims(client_id);
CREATE INDEX idx_claims_vehicle_id ON claims(vehicle_id);
CREATE INDEX idx_claims_assigned_employee_id ON claims(assigned_to_employee_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_job_number ON claims(job_number);
CREATE INDEX idx_claims_province_id ON claims(province_id);

CREATE TRIGGER update_claims_updated_at
BEFORE UPDATE ON claims
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for Appointment Scheduling
CREATE TABLE appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    scheduled_by_employee_id uuid NOT NULL REFERENCES profiles(id),
    repairer_id uuid NULL REFERENCES repairers(id) ON DELETE SET NULL COMMENT 'Link to repairer if appointment is at their premises',
    appointment_status text NOT NULL DEFAULT 'pending' COMMENT 'Consider Enum: pending, confirmed, rescheduled, cancelled, completed',
    appointment_datetime timestamptz NULL COMMENT 'Scheduled date and time',
    appointment_duration_minutes integer NULL COMMENT 'Estimated duration',
    -- Actual inspection times
    inspection_actual_start_datetime timestamptz NULL,
    inspection_actual_end_datetime timestamptz NULL,
    -- Logistics
    availability_notes text NULL COMMENT 'Client/Contact availability notes',
    location_type text NOT NULL DEFAULT 'other' COMMENT 'Consider Enum: repair_shop, client_address, owner_address, incident_scene, other',
    location_address text NULL COMMENT 'Specific address if not derived',
    appointment_contact_name text NULL,
    appointment_contact_phone text NULL,
    appointment_contact_email text NULL,
    special_instructions text NULL COMMENT 'Instructions for the attending adjuster',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE appointments IS 'Stores details of scheduled appointments related to a claim inspection.';
CREATE INDEX idx_appointments_claim_id ON appointments(claim_id);
CREATE INDEX idx_appointments_scheduled_by_employee_id ON appointments(scheduled_by_employee_id);
CREATE INDEX idx_appointments_repairer_id ON appointments(repairer_id);
CREATE INDEX idx_appointments_datetime ON appointments(appointment_datetime);

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for Specific Damage Items identified
CREATE TABLE damages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    damage_location text NOT NULL COMMENT 'Specific panel/component damaged (e.g., Front Bumper)',
    damage_description text NOT NULL,
    severity text NULL COMMENT 'Consider Enum: Minor, Moderate, Severe',
    damage_cause text NULL COMMENT 'Consider Enum: accident, hail, vandalism, fire, etc.',
    point_of_impact text NULL COMMENT 'Consider Enum: Front, Rear, Left Side, Roof, etc.',
    is_structural boolean NULL COMMENT 'Does this damage affect the vehicle structure?',
    estimated_repair_cost numeric(12, 2) NULL COMMENT 'Optional: Initial rough estimate per damage item',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE damages IS 'Details specific points of damage found during an inspection for a claim.';
CREATE INDEX idx_damages_claim_id ON damages(claim_id);

CREATE TRIGGER update_damages_updated_at
BEFORE UPDATE ON damages
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. ESTIMATION & COSTING
-- =============================================

CREATE TABLE estimates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    created_by_employee_id uuid NOT NULL REFERENCES profiles(id),
    estimate_number text NULL UNIQUE COMMENT 'User-friendly quote number (e.g., Q1001)',
    estimate_type text NOT NULL DEFAULT 'incident' COMMENT 'Consider Enum: incident, pre_incident, supplementary',
    estimate_source text NOT NULL DEFAULT 'in_house' COMMENT 'Consider Enum: in_house, third_party',
    status text NOT NULL DEFAULT 'draft' COMMENT 'Estimate workflow status. Consider Enum.',
    version integer NOT NULL DEFAULT 1 COMMENT 'Version number for revisions of same type/claim',
    repairer_id uuid NULL REFERENCES repairers(id) ON DELETE SET NULL COMMENT 'Repairer who provided estimate if source is third_party',
    -- Rates & Markups used for this estimate
    vat_rate_percentage numeric(5, 2) NOT NULL DEFAULT 15.00,
    panel_labor_rate numeric(10, 2) NULL,
    paint_labor_rate numeric(10, 2) NULL,
    strip_fit_labor_rate numeric(10, 2) NULL,
    mechanical_labor_rate numeric(10, 2) NULL,
    electrical_labor_rate numeric(10, 2) NULL,
    part_markup_percentage numeric(5, 2) DEFAULT 0.00,
    paint_material_rate numeric(10, 2) NULL,
    -- Calculated Vehicle Values (from Assessment)
    calculated_trade_value numeric(12, 2) NULL COMMENT 'Calculated trade value from assessment',
    calculated_retail_value numeric(12, 2) NULL COMMENT 'Calculated retail value from assessment',
    -- Original Calculated Totals
    subtotal_parts numeric(12, 2) DEFAULT 0.00,
    subtotal_labor numeric(12, 2) DEFAULT 0.00,
    subtotal_paint_materials numeric(12, 2) DEFAULT 0.00,
    subtotal_sublet numeric(12, 2) DEFAULT 0.00,
    subtotal_other numeric(12, 2) DEFAULT 0.00,
    total_before_vat numeric(12, 2) DEFAULT 0.00,
    total_vat numeric(12, 2) DEFAULT 0.00,
    total_amount numeric(12, 2) DEFAULT 0.00 COMMENT 'Grand total of the original estimate including VAT',
    -- Internal Approval
    approved_by_employee_id uuid NULL REFERENCES profiles(id),
    approved_at timestamptz NULL,
    -- Authorization
    authorized_repairer_id uuid NULL REFERENCES repairers(id) ON DELETE SET NULL,
    authorized_at timestamptz NULL,
    authorized_by_employee_id uuid NULL REFERENCES profiles(id),
    -- Final Costing (including additionals)
    final_costing_calculated_at timestamptz NULL,
    final_costing_calculated_by_employee_id uuid NULL REFERENCES profiles(id),
    final_subtotal_parts numeric(12, 2) NULL,
    final_subtotal_labor numeric(12, 2) NULL,
    final_subtotal_paint_materials numeric(12, 2) NULL,
    final_subtotal_sublet numeric(12, 2) NULL,
    final_subtotal_other numeric(12, 2) NULL,
    final_total_before_vat numeric(12, 2) NULL,
    final_total_vat numeric(12, 2) NULL,
    final_total_amount numeric(12, 2) NULL COMMENT 'Final cost including approved additionals + VAT',
    variance_amount numeric(12, 2) NULL COMMENT 'Difference between final and original total amounts',
    -- Notes & Timestamps
    notes text NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE estimates IS 'Represents a cost estimate/quote document, linked to a claim. Includes calculated vehicle values and final costing.';
CREATE INDEX idx_estimates_claim_id ON estimates(claim_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_authorized_repairer_id ON estimates(authorized_repairer_id);

CREATE TRIGGER update_estimates_updated_at
BEFORE UPDATE ON estimates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for individual lines within an estimate
CREATE TABLE estimate_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    damage_id uuid NULL REFERENCES damages(id) ON DELETE SET NULL, -- Optional link to specific damage
    sequence_number integer NOT NULL,
    description text NOT NULL,
    operation_code text NOT NULL COMMENT 'Consider Enum: N, R, RR, P, S, B, O, A, CR, R&R',
    part_number text NULL,
    part_cost numeric(12, 2) NULL,
    quantity numeric(8, 2) NOT NULL DEFAULT 1,
    strip_fit_hours numeric(6, 2) NULL,
    repair_hours numeric(6, 2) NULL, -- Panel/Mechanical/Electrical repair hours
    paint_hours numeric(6, 2) NULL,
    sublet_cost numeric(12, 2) NULL,
    is_included boolean NOT NULL DEFAULT true COMMENT 'Include in cost calculation?',
    line_notes text NULL,
    -- Calculated Values (Handle via View/Trigger/App Logic)
    calculated_part_total numeric(12, 2) DEFAULT 0.00,
    calculated_labor_total numeric(12, 2) DEFAULT 0.00,
    calculated_paint_material_total numeric(12, 2) DEFAULT 0.00,
    calculated_sublet_total numeric(12, 2) DEFAULT 0.00,
    calculated_line_total numeric(12, 2) DEFAULT 0.00,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE estimate_lines IS 'Stores individual line items within a cost estimate.';
CREATE INDEX idx_estimate_lines_estimate_id ON estimate_lines(estimate_id);
CREATE INDEX idx_estimate_lines_damage_id ON estimate_lines(damage_id);

CREATE TRIGGER update_estimate_lines_updated_at
BEFORE UPDATE ON estimate_lines
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Table for Additional work/parts requested by repairer
CREATE TABLE additional_lines (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE, -- Links to the original authorized estimate
    requested_by_repairer_id uuid NOT NULL REFERENCES repairers(id),
    requested_at timestamptz DEFAULT now(),
    status text NOT NULL DEFAULT 'requested' COMMENT 'Consider Enum: requested, approved, rejected',
    approved_or_rejected_by_employee_id uuid NULL REFERENCES profiles(id),
    approved_or_rejected_at timestamptz NULL,
    rejection_reason text NULL,
    -- Mirrored Structure from estimate_lines --
    sequence_number integer NOT NULL,
    description text NOT NULL,
    operation_code text NOT NULL COMMENT 'Consider Enum: N, R, RR, P, S, B, O, A, CR, R&R',
    part_number text NULL,
    part_cost numeric(12, 2) NULL,
    quantity numeric(8, 2) NOT NULL DEFAULT 1,
    strip_fit_hours numeric(6, 2) NULL,
    repair_hours numeric(6, 2) NULL,
    paint_hours numeric(6, 2) NULL,
    sublet_cost numeric(12, 2) NULL,
    is_included boolean NOT NULL DEFAULT true,
    line_notes text NULL,
    -- Calculated Values (Handle via View/Trigger/App Logic using parent estimate rates)
    calculated_part_total numeric(12, 2) DEFAULT 0.00,
    calculated_labor_total numeric(12, 2) DEFAULT 0.00,
    calculated_paint_material_total numeric(12, 2) DEFAULT 0.00,
    calculated_sublet_total numeric(12, 2) DEFAULT 0.00,
    calculated_line_total numeric(12, 2) DEFAULT 0.00,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
COMMENT ON TABLE additional_lines IS 'Stores line items for additional work requested by the repairer after initial estimate authorization.';
CREATE INDEX idx_additional_lines_estimate_id ON additional_lines(estimate_id);
CREATE INDEX idx_additional_lines_requested_by_repairer_id ON additional_lines(requested_by_repairer_id);
CREATE INDEX idx_additional_lines_status ON additional_lines(status);

CREATE TRIGGER update_additional_lines_updated_at
BEFORE UPDATE ON additional_lines
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 6. ATTACHMENTS (PHOTOS & DOCUMENTS)
-- =============================================

CREATE TABLE attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Link to Parent (Must link to at least one, maybe claim_id always required?)
    claim_id uuid NULL REFERENCES claims(id) ON DELETE CASCADE, -- Make NOT NULL if always required
    damage_id uuid NULL REFERENCES damages(id) ON DELETE SET NULL,
    additional_line_id uuid NULL REFERENCES additional_lines(id) ON DELETE SET NULL,
    -- Metadata
    uploaded_by_employee_id uuid NOT NULL REFERENCES profiles(id),
    storage_path text NOT NULL UNIQUE COMMENT 'Full path within Supabase Storage bucket (e.g., claims/claim_uuid/photos/...)',
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size integer NOT NULL COMMENT 'Size in bytes',
    description text NULL,
    created_at timestamptz DEFAULT now()
    -- Check constraint to ensure attachment links to only one specific sub-entity (damage or additional) if claim_id is always present.
    -- Or ensure it links to exactly one parent if claim_id is not always required. Adjust as needed.
    -- CONSTRAINT chk_attachment_parent CHECK (num_nonnulls(damage_id, additional_line_id) <= 1)
);
COMMENT ON TABLE attachments IS 'Stores metadata about uploaded files (photos, documents) linked to Supabase Storage.';
CREATE INDEX idx_attachments_claim_id ON attachments(claim_id);
CREATE INDEX idx_attachments_damage_id ON attachments(damage_id);
CREATE INDEX idx_attachments_additional_line_id ON attachments(additional_line_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by_employee_id);

-- =============================================
--          Notes & Recommendations
-- =============================================
-- 1. Enums: Strongly consider using PostgreSQL ENUM types for fields like 'role', 'status', 'type_of_loss',
--    'inspection_method', 'operation_code', 'location_type', 'damage_cause', etc., to enforce data consistency.
--    Example: CREATE TYPE claim_status AS ENUM ('received', 'assigned', ...); ALTER TABLE claims ALTER COLUMN status TYPE claim_status USING status::claim_status;
-- 2. RLS (Row Level Security): Implement comprehensive RLS policies on all tables based on user roles ('profiles.role')
--    and assignments (e.g., `assigned_employee_id`, `created_by_employee_id`) to control data access.
-- 3. Storage RLS: Implement corresponding RLS policies on your Supabase Storage bucket(s) to control file access.
-- 4. Calculation Logic: Decide whether to implement estimate/additional line total calculations and estimate summary
--    calculations using Database Views, Functions/Triggers, or within your application layer. Database-level often ensures more consistency.
-- 5. Indexing: Review and add further indexes based on common query patterns as your application develops.
-- 6. Foreign Key ON DELETE: Review all `ON DELETE` actions (CASCADE, SET NULL, RESTRICT) to ensure they match your desired data retention behavior.
-- 7. Unique Constraints: Add unique constraints where necessary (e.g., email within a client, job numbers).
-- =============================================

-- =============================================
-- 4. FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update 'updated_at' automatically (re-stated for clarity)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically sets updated_at on table update.';

-- Function to set has_pending_additionals flag on claims
CREATE OR REPLACE FUNCTION update_claim_additionals_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE claims SET has_pending_additionals = TRUE WHERE id = NEW.estimate_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'Requested' THEN
            UPDATE claims SET has_pending_additionals = TRUE WHERE id = NEW.estimate_id;
        ELSE
            -- Check if any other additionals are still pending for this claim
            PERFORM 1 FROM additional_lines WHERE estimate_id = NEW.estimate_id AND status = 'Requested';
            IF NOT FOUND THEN
                UPDATE claims SET has_pending_additionals = FALSE WHERE id = NEW.estimate_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Check if any other additionals are still pending for this claim
        PERFORM 1 FROM additional_lines WHERE estimate_id = OLD.estimate_id AND status = 'Requested';
        IF NOT FOUND THEN
            UPDATE claims SET has_pending_additionals = FALSE WHERE id = OLD.estimate_id;
        END IF;
    END IF;
    RETURN NULL; -- Result is ignored since this is an AFTER trigger
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION update_claim_additionals_status() IS 'Updates claims.has_pending_additionals based on status changes in additional_lines.';

-- Function to generate client-specific job numbers
CREATE OR REPLACE FUNCTION public.generate_client_job_number()
RETURNS TRIGGER AS $$
DECLARE
  client_code VARCHAR(5);
  next_seq INTEGER;
BEGIN
  -- Lock the client row and get the code + sequence
  SELECT code, last_claim_sequence INTO client_code, next_seq
  FROM public.clients
  WHERE id = NEW.client_id
  FOR UPDATE; -- Lock the row

  -- If client not found or code is null, raise error (shouldn't happen with FK and NOT NULL constraint)
  IF NOT FOUND OR client_code IS NULL THEN
    RAISE EXCEPTION 'Client code not found or is null for client_id %', NEW.client_id;
  END IF;

  -- Increment sequence
  next_seq := next_seq + 1;

  -- Update the client's sequence number
  UPDATE public.clients
  SET last_claim_sequence = next_seq
  WHERE id = NEW.client_id;

  -- Format the job number (e.g., ABC00001 - using 5 digits padding)
  NEW.job_number := client_code || lpad(next_seq::text, 5, '0');

  RETURN NEW; -- Allow the INSERT to proceed
END;
$$ LANGUAGE plpgsql;
COMMENT ON FUNCTION public.generate_client_job_number() IS 'Generates a unique, sequential job number per client (e.g., ABC00001) before inserting a claim.';

-- Apply the updated_at trigger to relevant tables
CREATE TRIGGER update_provinces_updated_at BEFORE UPDATE ON provinces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repairers_updated_at BEFORE UPDATE ON repairers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON client_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_accessories_updated_at BEFORE UPDATE ON vehicle_accessories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_damages_updated_at BEFORE UPDATE ON damages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimate_lines_updated_at BEFORE UPDATE ON estimate_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_additional_lines_updated_at BEFORE UPDATE ON additional_lines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for has_pending_additionals flag
CREATE TRIGGER trg_update_claim_additionals
AFTER INSERT OR UPDATE OR DELETE ON additional_lines
FOR EACH ROW EXECUTE FUNCTION update_claim_additionals_status();

-- Trigger for auto-generating job numbers
CREATE TRIGGER trg_generate_job_number
BEFORE INSERT ON public.claims
FOR EACH ROW
EXECUTE FUNCTION public.generate_client_job_number();

-- End of Schema Definition
```

**Mermaid ERD Diagram (Overview):**

```mermaid
erDiagram
    provinces { uuid id PK; text name }
    profiles { uuid id PK; uuid province_id FK; text role }
    clients { uuid id PK; text name }
    client_contacts { uuid id PK; uuid client_id FK }
    vehicles { uuid id PK; text make; text vin UK }
    vehicle_accessories { uuid id PK; uuid vehicle_id FK }
    repairers { uuid id PK; text name; boolean is_globally_approved }
    client_approved_repairers { uuid client_id PK,FK; uuid repairer_id PK,FK }
    claims { uuid id PK; uuid client_id FK; uuid vehicle_id FK; uuid assigned_employee_id FK; text status; text job_number UK }
    appointments { uuid id PK; uuid claim_id FK; uuid repairer_id FK; timestamptz appointment_datetime }
    damages { uuid id PK; uuid claim_id FK; text damage_location }
    estimates { uuid id PK; uuid claim_id FK; text estimate_number UK; text status; numeric total_amount; numeric final_total_amount }
    estimate_lines { uuid id PK; uuid estimate_id FK; text description; text operation_code }
    additional_lines { uuid id PK; uuid estimate_id FK; uuid requested_by_repairer_id FK; text status }
    attachments { uuid id PK; uuid claim_id FK; uuid damage_id FK; uuid additional_line_id FK; text storage_path UK }

    %% --- Relationships ---
    provinces ||--o{ profiles : operates_in; provinces ||--o{ claims : located_in; provinces ||--o{ repairers : located_in
    profiles ||--o{ claims : created_by; profiles ||--o{ claims : assigned_to; profiles ||--o{ claims : assigned_by; profiles ||--o{ attachments : uploaded_by; profiles ||--o{ appointments : scheduled_by; profiles }o--|| estimates : created_by; profiles }o--|| estimates : approved_by; profiles }o--|| estimates : authorized_by; profiles }o--|| additional_lines : approves/rejects
    clients ||--o{ claims : requests; clients ||--o{ client_contacts : employs; clients ||--o{ client_approved_repairers : approves
    client_contacts }o--|| claims : handles
    vehicles ||--o{ claims : associated_with; vehicles ||--o{ vehicle_accessories : has
    repairers ||--o{ client_approved_repairers : approved_by; repairers }o--|| appointments : location_for; repairers }o--|| estimates : prepared_by/for; repairers }o--|| estimates : authorized_for; repairers ||--o{ additional_lines : requests
    claims ||--o{ damages : has; claims ||--o{ attachments : has_general; claims ||--o{ appointments : has; claims ||--o{ estimates : has
    appointments ||--o{ attachments : has_specific (if needed)
    damages }o--|| attachments : documents_specific; damages }o--|| estimate_lines : relates_to
    estimates ||--o{ estimate_lines : contains; estimates ||--o{ additional_lines : has_additionals
    estimate_lines ||--o{ attachments : documents_specific (if needed)
    additional_lines }o--|| attachments : supports_additional
```

This comprehensive schema provides a solid foundation for your application. Remember to implement the Enum types, RLS policies, and calculation logic as discussed.