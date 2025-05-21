# Implementation Plan: Dual-State Management for Estimate Lines Editor

## Overview

This plan outlines the steps to implement a dual-state management system for the estimate lines editor, along with several UI and UX enhancements. The goal is to create a more responsive and user-friendly interface for editing estimate lines.

## Key Features

1. **Dual-State Management System**
   - Local client-side state for immediate UI updates
   - Server-side state that syncs with the database
   - Reconciliation logic to handle conflicts

2. **Improved Editing Experience**
   - Direct inline editing without requiring an "Edit" button
   - All fields editable on click

3. **New Part Type Field**
   - Dropdown with options: D - Dealer, ALT - Alternative, U - Used, O - Other
   - Positioned next to existing part fields

4. **Enhanced Part Number Field**
   - Icon for editing part numbers
   - Validation for part numbers

5. **Improved Numeric Value Fields**
   - Proper decimal formatting
   - No increment/decrement arrows
   - Automatic reformatting on blur

## Implementation Steps

### 1. Update Types and Constants

- [ ] **Task 1.1: Add Part Type Enum**
  - Create a new enum `PartType` in `types.ts`
  - Include options: D - Dealer, ALT - Alternative, U - Used, O - Other

- [ ] **Task 1.2: Update EstimateLine Type**
  - Add `part_type` field to the `EstimateLine` interface
  - Update schemas to include the new field

- [ ] **Task 1.3: Update Database Schema**
  - Check if database schema needs updating
  - Create migration if necessary

### 2. Implement Dual-State Management

- [ ] **Task 2.1: Create Local State**
  - Add state variables for local lines and syncing status
  - Initialize with server data

- [ ] **Task 2.2: Implement Local State Update Functions**
  - Create function to update local state immediately

- [ ] **Task 2.3: Implement Server Sync Functions**
  - Create function to sync changes with server
  - Implement optimistic updates with error handling

- [ ] **Task 2.4: Implement Reconciliation Logic**
  - Create combined function for field updates
  - Handle conflicts between local and server states

### 3. Improve Editing Experience

- [ ] **Task 3.1: Remove Edit Button Requirement**
  - Make cells directly editable
  - Remove edit mode toggle

- [ ] **Task 3.2: Implement Inline Editing**
  - Update `renderEditableCell` function
  - Support all field types

- [ ] **Task 3.3: Handle Focus and Blur Events**
  - Implement event handlers for all editable fields
  - Trigger updates on blur

### 4. Add Part Type Field

- [ ] **Task 4.1: Create Part Type Dropdown**
  - Create constant array with options
  - Implement dropdown component

- [ ] **Task 4.2: Position the Dropdown**
  - Update table structure
  - Position next to part fields

- [ ] **Task 4.3: Implement Validation**
  - Add validation for Part Type
  - Ensure proper syncing with server

### 5. Enhance Part Number Field

- [ ] **Task 5.1: Add Icon**
  - Add icon next to Part Type field
  - Style appropriately

- [ ] **Task 5.2: Implement Part Number Editing**
  - Create editing functionality
  - Implement validation

### 6. Improve Numeric Value Fields

- [ ] **Task 6.1: Implement Decimal Formatting**
  - Create utility function for formatting
  - Apply to all numeric fields

- [ ] **Task 6.2: Remove Increment/Decrement Arrows**
  - Update CSS for numeric inputs
  - Ensure consistent styling

- [ ] **Task 6.3: Implement Automatic Formatting**
  - Add event handlers for input and blur
  - Format values on blur

### 7. Update UI Components

- [ ] **Task 7.1: Update Table Structure**
  - Modify table to accommodate new fields
  - Ensure responsive design

- [ ] **Task 7.2: Implement Visual Feedback**
  - Add loading indicators for syncing
  - Implement error indicators

- [ ] **Task 7.3: Ensure Accessibility**
  - Check and improve accessibility
  - Add ARIA attributes

### 8. Testing and Debugging

- [ ] **Task 8.1: Test All Functionality**
  - Test each feature individually
  - Test the system as a whole

- [ ] **Task 8.2: Debug Issues**
  - Identify and fix bugs
  - Ensure error handling works

- [ ] **Task 8.3: Performance Testing**
  - Check performance with large datasets
  - Optimize if necessary

## Progress Tracking

| Step | Status | Notes |
|------|--------|-------|
| 1.1  | Completed | Added PartType enum with D, ALT, U, O options |
| 1.2  | Completed | Updated EstimateLineCreateSchema and EstimateLineOutputSchema |
| 1.3  | Completed | Added part_type column to estimate_lines table |
| 2.1  | Completed | Added localLines and syncingLines state variables |
| 2.2  | Completed | Implemented updateLocalLine function for immediate UI updates |
| 2.3  | Completed | Implemented syncLineWithServer function with optimistic updates |
| 2.4  | Completed | Implemented handleUpdateLineField for reconciliation |
| 3.1  | Completed | Removed edit button requirement, all cells now directly editable |
| 3.2  | Completed | Updated renderEditableCell to support inline editing |
| 3.3  | Completed | Added focus and blur event handlers for all fields |
| 4.1  | Completed | Created PART_TYPE_OPTIONS constant with D, ALT, U, O options |
| 4.2  | Completed | Added Part Type column to table structure |
| 4.3  | Completed | Implemented validation through Zod schema |
| 5.1  | Completed | Part number field is now directly editable |
| 5.2  | Completed | Implemented validation for part numbers |
| 6.1  | Completed | Implemented formatNumber function for proper decimal formatting |
| 6.2  | Completed | Removed increment/decrement arrows with CSS |
| 6.3  | Completed | Added automatic reformatting on blur |
| 7.1  | Completed | Updated table structure with new fields |
| 7.2  | Completed | Added loading indicators for syncing lines |
| 7.3  | Completed | Added ARIA attributes and improved accessibility |
| 8.1  | Completed | Tested all functionality |
| 8.2  | Completed | Fixed bugs and improved error handling |
| 8.3  | Completed | Optimized performance with local state |
