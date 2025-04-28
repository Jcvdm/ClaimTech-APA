# ClaimTech

ClaimTech is a modern claims management system built with Next.js, React, and Supabase. The application is designed to streamline the entire claims lifecycle for insurance companies, loss adjusters, and claims handlers.

## Project Overview

The application provides a comprehensive set of features for managing claims, vehicles, appointments, documents, and reporting, with a focus on efficiency, transparency, and user experience.

## Key Features

- **Claims Management**: Create, update, and track claims
- **Vehicle Management**: Record vehicle details and link to claims
- **Appointment Scheduling**: Schedule and manage appointments
- **Document Management**: Upload and store documents
- **Reporting and Analytics**: Generate reports and track KPIs

## Technology Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, React 19, Tailwind CSS, Shadcn UI
- **State Management**: TanStack Query (React Query)
- **Backend**: tRPC, PostgreSQL (via Supabase), Supabase Auth
- **Form Handling**: React Hook Form with Zod validation

## Architecture

The application follows a modern React architecture with Next.js App Router, using a combination of server and client components for optimal performance. It implements a Data Access Layer (DAL) pattern for data fetching and caching.

## Directory Structure

- `CPA/src/app/` - Next.js App Router pages and layouts
- `CPA/src/components/` - Reusable UI components
- `CPA/src/features/` - Domain-specific feature implementations
- `CPA/src/lib/` - Utility functions and API client code
- `CPA/src/server/` - Server-side API implementation
- `CPA/src/trpc/` - tRPC client and server configuration