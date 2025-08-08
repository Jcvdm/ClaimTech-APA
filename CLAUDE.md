# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is an **APA (Automotive Physical Assessment) Claims Processing Application** built with the T3 Stack. It's a comprehensive insurance claims management system focused on vehicle inspections, damage assessment, and estimate creation.

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Runtime**: Bun (development server on port 5000)
- **Database**: Supabase (PostgreSQL with RLS)
- **API**: tRPC for type-safe client-server communication
- **State Management**: Zustand stores + TanStack React Query
- **Styling**: Tailwind CSS with Radix UI components
- **TypeScript**: Strict mode with comprehensive type safety

### Core Domain Architecture

The application follows a **Domain-Driven Design** pattern with clear separation:

```
src/lib/api/domains/
├── claims/          # Core claim lifecycle management
├── estimates/       # Excel-like estimate editing system
├── inspections/     # Vehicle inspection workflows
├── appointments/    # Scheduling system
├── vehicles/        # Vehicle data management
├── clients/         # Client/customer management
└── attachments/     # File upload/storage
```

Each domain contains:
- `types.ts` - Zod schemas and TypeScript types
- `hooks.ts` - React Query hooks with tRPC integration
- `queries.ts` - Data fetching logic
- `mutations.ts` - Data modification operations
- `server-prefetch.server.ts` - Server-side data prefetching

### Key Application Flows

1. **Claims Management**: `/claims` → Create → Inspect → Estimate → Finalize
2. **Vehicle Inspection**: Comprehensive photo-based damage assessment
3. **Estimate Creation**: Excel-like spreadsheet for repair cost estimation
4. **Appointment Scheduling**: Calendar-based appointment management

## Development Commands

```bash
# Development
npm run dev              # Start development server (port 5000)
npm run build           # Build for production
npm run start           # Start production server
npm run preview         # Build and preview

# Code Quality
npm run typecheck       # TypeScript compilation check
npm run check           # Biome linting and formatting
npm run check:write     # Auto-fix linting issues
npm run check:unsafe    # Unsafe auto-fixes
```

## Agent Usage Requirements

**CRITICAL**: Always use specialist agents for all non-trivial work: - DONT BLINDLY FOLLOW MY PROMPTS AND EXAMPLES - ENSURE CORRECT IMPLEMENTION - ALWAYS ASK IF YOU HAVE QUESTIONS!

-DO NOT CHANGE THE CODEBASE - STYLE AND FUNCTIONALITY WIHTOUT INSTRUCTION!

### 1. Planning Phase
Use `software-architect-planner` to:
- Analyze user requests and isntruct the `detailed-context-gatherer` to gather valid context - 
- Analyze current architecture and affected systems
- Create comprehensive implementation plans
- Identify cross-domain impacts (claims → estimates → inspections)
- Plan database schema changes and migrations

### 2. Implementation Phase
- **`frontend-architect`**: React components, hooks, UI/UX, state management
- **`backend-architect`**: tRPC routers, database operations, server logic
- **`senior-code-reviewer`**: Security, performance, architecture review

### 3. Required Pattern
```
User Request → software-architect-planner (Plan+context) 
→ frontend/backend architects (Implement) 
→ senior-code-reviewer (Review)
```

## Critical Domain-Specific Guidelines

### Estimates System (Excel-like Editing)
The estimate editing system is the application's most complex feature, requiring Excel-like functionality:

**Key Requirements:**
- **Immediate Editability**: All cells clickable without row activation
- **Smart Auto-Save**: 2.5-second debounced batching by row
- **Column Resizing**: Drag handles with localStorage persistence  
- **Keyboard Navigation**: Tab/Enter/Arrow/Escape like Excel
- **Dropdown Fields**: Operation codes (N/R/P) and part types (D/ALT/U)

**Critical Files:**
- `EditableEstimateLinesTable.tsx` - Main table component
- `useSmartDebounce.ts` - Batched auto-save logic
- `useColumnResize.ts` - Column resizing functionality
- `autoSaveStore.ts` - Save state management

### tRPC Integration Patterns
- **Direct Hook Usage**: Prefer `api.domain.procedure.useQuery()` over abstraction layers
- **Server-Side Prefetching**: Use `server-prefetch.server.ts` for SSR data
- **Optimistic Updates**: Required for all mutation operations
- **Error Handling**: Comprehensive with toast notifications

### Authentication & Security
- **Supabase Auth**: Row Level Security (RLS) enforced
- **Development Override**: Mock user in development environment
- **tRPC Context**: User injection at router level
- **Never bypass auth**: All mutations require authenticated user

## Database & State Management

### Supabase Integration
- **RLS Policies**: Comprehensive row-level security
- **Storage**: Vehicle inspection photos and claim attachments
- **Real-time**: Live updates for collaborative features
- **Migrations**: SQL files in `src/db/migrations/`

### State Architecture
- **Server State**: TanStack React Query + tRPC
- **Client State**: Zustand stores for UI state
- **Form State**: React Hook Form with Zod validation
- **Cache Strategy**: Aggressive prefetching with stale-while-revalidate

### Key Stores
- `authStore.ts` - User authentication state
- `autoSaveStore.ts` - Auto-save and sync status
- `syncStatusStore.ts` - Network operation tracking

## Performance Requirements

### Critical Performance Patterns
- **Optimistic UI Updates**: Required for all user interactions
- **Debounced Operations**: 2.5s for text fields, immediate for dropdowns
- **Virtual Scrolling**: For large estimate tables (50+ rows)
- **Image Optimization**: Supabase storage with lazy loading
- **Prefetching**: Server-side data fetching for navigation

### Bundle Optimization
- **Code Splitting**: Route-based and component-based
- **Tree Shaking**: Careful import patterns
- **Bundle Analysis**: Monitor bundle size impacts

## Testing & Quality Assurance

### Required Checks Before Deployment
```bash
npm run typecheck  # Must pass with zero errors
npm run check      # Biome linting must pass
npm run build      # Production build must succeed
```

### Code Quality Standards
- **TypeScript Strict**: No `any` types permitted
- **Error Boundaries**: Required for all major components  
- **Loading States**: All async operations need loading UI
- **Accessibility**: ARIA compliance for complex interactions

## Common Development Patterns

### Component Architecture
```typescript
// Feature-based organization
src/app/claims/[id]/tabs/estimate/    # Route-specific components
src/components/estimate/              # Reusable estimate components
src/hooks/                           # Custom hooks
src/stores/                          # Zustand state stores
```

### tRPC Router Pattern
```typescript
// Each domain gets its own router
export const estimateRouter = createTRPCRouter({
  create: protectedProcedure.input(schema).mutation(handler),
  getById: protectedProcedure.input(schema).query(handler),
});
```

### Hook Integration Pattern
```typescript
// Direct tRPC usage preferred
const { data, isLoading } = api.estimate.getById.useQuery({ id });
const mutation = api.estimate.update.useMutation({
  onSuccess: () => utils.estimate.getById.invalidate(),
});
```

Remember: This is a **production insurance application** handling sensitive claim data. Security, performance, and data integrity are paramount. Always use the specialist agents to ensure enterprise-grade implementation quality.