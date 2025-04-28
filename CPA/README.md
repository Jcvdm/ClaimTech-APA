# ClaimTech - Claims Processing Application

ClaimTech is a modern claims management system built with Next.js, React, and Supabase. The application is designed to streamline the entire claims lifecycle for insurance companies, loss adjusters, and claims handlers.

## Project Structure

```
CPA/
├── src/                  # Source code
│   ├── app/              # Next.js App Router pages and layouts
│   ├── components/       # Reusable UI components
│   ├── features/         # Domain-specific feature implementations
│   ├── lib/              # Utility functions and API client code
│   ├── server/           # Server-side API implementation
│   ├── trpc/             # tRPC client and server configuration
│   ├── styles/           # Global CSS and styling
│   ├── utils/            # Utility functions
│   ├── hooks/            # Custom React hooks
│   ├── db/               # Database schema and migrations
│   └── stores/           # Global state management
├── public/               # Static assets
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── next.config.js        # Next.js configuration
├── postcss.config.js     # PostCSS configuration
├── biome.jsonc           # Biome configuration
└── components.json       # Shadcn UI configuration
```

## Technology Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, React 19, Tailwind CSS, Shadcn UI
- **State Management**: TanStack Query (React Query)
- **Backend**: tRPC, PostgreSQL (via Supabase), Supabase Auth
- **Form Handling**: React Hook Form with Zod validation

## Key Features

- **Claims Management**: Create, update, and track claims
- **Vehicle Management**: Record vehicle details and link to claims
- **Appointment Scheduling**: Schedule and manage appointments
- **Document Management**: Upload and store documents
- **Reporting and Analytics**: Generate reports and track KPIs

## Getting Started

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Set up environment variables:
   Create a `.env.local` file with the following:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5000](http://localhost:5000) in your browser.

## Development Commands

- **Start Development Server**: `npm run dev`
- **Build**: `npm run build`
- **Start Production Server**: `npm start`
- **Type Check**: `npm run typecheck`
- **Lint**: `npm run check`