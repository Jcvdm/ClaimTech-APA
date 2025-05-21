# Component Optimization Guidelines

## Core Principle
Always strive to minimize component complexity and size by breaking down large components into smaller, focused units.

## Analysis Procedure

When encountering a large component (typically >300 lines), follow this systematic approach:

1. **Identify Responsibilities**
   - Form state management
   - Schema/validation logic
   - Data fetching
   - UI rendering sections
   - Event handling logic
   - Complex state transformations

2. **Extract Logical Units**
   - **Schema/Type Definitions**: Move to dedicated files
   - **Custom Hooks**: Extract reusable logic (form handling, data fetching, etc.)
   - **UI Sections**: Create sub-components for distinct visual sections
   - **Utility Functions**: Move pure functions to utility files

3. **Component Extraction Criteria**
   - Does it have a single responsibility?
   - Can it be reused elsewhere?
   - Does it have its own state management needs?
   - Does it represent a distinct UI section?
   - Is it complex enough to warrant separation?

## Implementation Guidelines

### For Custom Hooks
- Name with `use` prefix (e.g., `useFormNavigation`)
- Accept minimal required dependencies
- Return only what's needed by consumers
- Handle a single logical concern

### For Sub-Components
- Pass only required props
- Use TypeScript interfaces to define prop types
- Consider using React Context for deeply nested component trees
- Keep components focused on rendering, delegate logic to hooks

### For Schema/Type Files
- Export types and schemas needed by components
- Group related schemas together
- Consider using partial schemas for complex forms

## Example Structure

For a complex form component:

```
src/features/claims/
├── components/
│   ├── ClaimForm.tsx              # Main container component
│   ├── ClaimInfoSection.tsx       # Tab/section component
│   ├── VehicleDetailsSection.tsx  # Tab/section component
│   └── ...
├── hooks/
│   ├── useClaimForm.ts            # Form state and submission
│   ├── useTabNavigation.ts        # Tab navigation logic
│   └── ...
├── schemas/
│   └── claimFormSchema.ts         # Validation schemas
└── types/
    └── claim.ts                   # Type definitions
```

## Benefits
- Improved code readability
- Better maintainability
- Easier testing
- Reduced cognitive load
- Better performance through targeted re-renders

## When NOT to Split
- When components are already small (<100 lines)
- When splitting would create unnecessary abstraction
- When components are tightly coupled and splitting would require complex prop drilling

Always evaluate the trade-off between component size and the complexity introduced by additional abstraction layers.
