# ClaimTech - Claims Processing Application

ClaimTech is a modern claims management system built with Next.js, React, and Supabase. The application is designed to streamline the entire claims lifecycle for insurance companies, loss adjusters, and claims handlers.

## Repository Structure

This repository is set up to only track the `CPA` directory, which contains the ClaimTech application code. All other directories and files in the workspace are ignored by Git.

```
ClaimTech-APA/
└── CPA/                  # Claims Processing Application (tracked by Git)
    ├── src/              # Source code
    ├── public/           # Static assets
    ├── package.json      # Dependencies and scripts
    └── ...               # Configuration files
```

## Getting Started

The main application code is in the `CPA` directory. Please refer to the [CPA/README.md](CPA/README.md) file for detailed information about the project structure, technology stack, and setup instructions.

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

## Development

To start working on the project, navigate to the CPA directory and follow the setup instructions in the [CPA/README.md](CPA/README.md) file.