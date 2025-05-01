# CPA Application Memory Bank

This directory contains documentation and memory files for the CPA (Claims Processing Application) project. These files serve as a knowledge base for the application's architecture, implementation details, and development decisions.

## Contents

- [Server-Side Rendering Implementation](./server_side_rendering.md) - Details about the implementation of server-side rendering with proper caching.
- [Appointment Editing System](./appointment_editing.md) - Implementation of the appointment editing system with real-time updates.
- [Vehicle Inspection Process](./vehicle_inspection.md) - Implementation of the vehicle inspection process with status updates.

## Application Overview

The CPA application is a claims processing system built with Next.js, React, and tRPC. It follows a modern architecture with server-side rendering, client-side caching, and a data access layer pattern.

### Key Technologies

- **Next.js**: App Router for server components and routing
- **React**: UI components and state management
- **tRPC**: Type-safe API layer
- **TanStack Query**: Data fetching and caching
- **Supabase**: Database and authentication
- **Shadcn UI**: Component library

### Architecture

The application follows a layered architecture:

1. **UI Layer**: React components and pages
2. **Data Access Layer**: tRPC procedures and TanStack Query hooks
3. **API Layer**: tRPC routers and procedures
4. **Database Layer**: Supabase database

### Directory Structure

- `src/app`: Next.js App Router pages and layouts
- `src/components`: Reusable UI components
- `src/features`: Domain-specific features
- `src/lib`: Utility functions and domain logic
- `src/server`: Server-side code including tRPC routers
- `src/trpc`: tRPC client setup
- `src/utils`: General utility functions

## Development Guidelines

1. **Server-Side Rendering**: Prefer server-side rendering for initial data loading
2. **Data Access Layer**: Use the DAL pattern for data fetching and caching
3. **Query Keys**: Use consistent query keys for cache management
4. **Error Handling**: Implement comprehensive error handling
5. **Type Safety**: Leverage TypeScript and Zod for type safety
