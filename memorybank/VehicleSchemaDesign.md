# Vehicle Schema Design

## Core Principles

1. **Vehicles are Claim-Specific**: Each claim creates a new vehicle record, even if it's the same physical vehicle as another claim.
2. **No Unique Constraints on Vehicle Identifiers**: VIN, registration numbers, and engine numbers should NOT have unique constraints.
3. **Multiple Claims Per Vehicle**: The same physical vehicle can have multiple claims over time.
4. **Vehicle-Claim Relationship**: Vehicles are associated with claims, not directly with clients.

## Database Design

The `vehicles` table:

- Does NOT have unique constraints on `vin`, `registration_number`, or `engine_number`
- Has a required `make` field
- Stores basic vehicle information relevant to the claim
- Is linked to exactly one claim
- Does NOT have a direct `client_id` field (the relationship is through claims)

## Implementation Notes

When creating a new claim:
- Always create a new vehicle record
- Do not attempt to reuse existing vehicle records
- Ensure at least one identifier (VIN, registration number, or engine number) is provided
- The year field defaults to the current year and is validated to be between 1900 and the current year

## Validation Rules

- Vehicle make is required
- At least one identifier (VIN, registration number, or engine number) is required
- Year should be between 1900 and the current year (if provided)
- All other fields are optional

## Relationship with Claims

- Each vehicle is associated with exactly one claim
- Each claim must have exactly one vehicle
- The relationship is enforced at the database level with a foreign key constraint
- Vehicles are NOT directly associated with clients - the relationship is always through a claim

## Schema Fixes

We've made the following fixes to align the schema with these principles:

1. Removed unique constraints on `vin` and `registration_number` columns
2. Removed `client_id` field from vehicle creation process
3. Set default year to current year with proper validation
