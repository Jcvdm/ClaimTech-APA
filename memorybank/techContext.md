# Technical Context

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS
- **Component Library**: Shadcn UI
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **API Client**: tRPC

### Backend
- **API Layer**: tRPC
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Serverless Functions**: Edge Functions (Supabase)

## Development Environment

### Tools
- **Package Manager**: npm (with --legacy-peer-deps for React 19 compatibility)
- **Version Control**: Git
- **IDE**: VS Code
- **API Testing**: Postman / Insomnia

### Commands
- **Start Development Server**: `npm run dev`
- **Build**: `npm run build`
- **Start Production Server**: `npm start`
- **Lint**: `npm run lint`

## Architecture

### Next.js App Router
- File-based routing system
- Mix of server and client components
- Server-side rendering capabilities
- API routes via route handlers

### Data Access Layer (DAL)
- Separation of data fetching logic from UI components
- Domain-specific folders (claims, vehicles, clients, etc.)
- Consistent patterns for queries, mutations, and hooks
- Centralized cache management

### Server Components
- Used for data fetching and initial rendering
- Marked with `.server.ts` extension for server-only code
- Wrapped with ErrorBoundary and Suspense for error handling and loading states
- Use React's cache() function for request deduplication

### Client Components
- Marked with 'use client' directive
- Used for interactive UI elements
- Hydrated from server-rendered HTML
- Use TanStack Query for client-side data fetching and caching

## Key Patterns

### Server-Side Rendering
- Server components fetch data and render HTML
- Client components hydrate for interactivity
- Parallel data fetching for performance
- Error boundaries for resilience

### Hybrid Caching Strategy
- Server-side prefetching for initial render
- Client-side caching for subsequent requests
- Fallback mechanisms for resilience
- Intelligent prefetching for performance
- Extended cache times for claim sessions (30+ minutes)
- Active session tracking for dynamic cache extension
- Cache persistence across page refreshes
- Manual cache control with visual indicators for stale data

### Form Handling
- Multi-tab organization for complex forms
- Field-level validation with Zod
- Form sections extracted into separate components
- React Hook Form for state management

### Error Handling
- ErrorBoundary components for catching and displaying errors
- Graceful degradation for partial data
- Informative error messages for debugging
- Retry mechanisms for transient failures
- Defensive coding for robust data handling
- Try-catch blocks around prefetch operations
- Proper date validation and conversion
- Consistent query key generation with createEntityQueryKey
- Active session tracking with reliable query key generation
- Component stability through consistent error handling patterns

## Database Schema

### Key Tables
- **claims**: Core table for claim information
- **vehicles**: Vehicle information linked to claims
- **clients**: Client information
- **appointments**: Appointments related to claims
- **attachments**: Documents and files related to claims
- **provinces**: Reference data for provinces
- **employees**: Employee information

### Important Relationships
- Claims have one Vehicle
- Claims have one Client
- Claims have many Appointments
- Claims have many Attachments
- Claims can be assigned to Employees

## API Structure

### tRPC Routers
- **claim**: Claim-related endpoints
- **vehicle**: Vehicle-related endpoints
- **client**: Client-related endpoints
- **appointment**: Appointment-related endpoints
- **attachment**: Attachment-related endpoints
- **lookup**: Reference data endpoints

### Common Patterns
- Queries for fetching data
- Mutations for modifying data
- Input validation with Zod
- Error handling with try/catch
- Transactions for complex operations

## Performance Considerations

### Server-Side Rendering
- Reduces client-side processing
- Improves initial load time
- Better SEO and core web vitals
- Progressive enhancement for resilience

### Data Fetching
- Parallel data fetching for performance
- Prefetching for anticipated user actions
- Caching for reduced network requests
- Stale-while-revalidate pattern for freshness

### Bundle Size
- Code splitting for reduced initial load
- Dynamic imports for lazy loading
- Tree shaking for dead code elimination
- Image optimization for reduced page weight

## Security Considerations

### Authentication
- Supabase Auth for user authentication
- JWT tokens for API authorization
- Row-level security in database
- Protected procedures in tRPC

### Data Validation
- Input validation with Zod
- Output validation with Zod
- Sanitization of user input
- Prepared statements for database queries

### CORS and CSP
- Strict CORS policy
- Content Security Policy
- HTTPS only
- Secure cookies
