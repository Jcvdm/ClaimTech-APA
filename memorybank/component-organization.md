# Component Organization Guidelines

This document outlines the guidelines and patterns for organizing components in the ClaimTech application.

## Core Principles

1. **Domain-Specific Organization**: Components should be organized by domain in the features directory
2. **Separation of Concerns**: Separate client and server components
3. **Discoverability**: Components should be easy to find and understand
4. **Reusability**: Generic components should be reusable across domains
5. **Consistency**: Follow consistent patterns for component organization

## Directory Structure

### Generic UI Components

Generic, reusable UI components should be placed in:

```
CPA/src/components/ui/
```

Examples: Button, Card, Input, Select, etc.

### Layout Components

Layout components that define the structure of the application should be placed in:

```
CPA/src/components/layout/
```

Examples: AppSidebar, MainContentWrapper, Footer, etc.

### Domain-Specific Components

Domain-specific components should be organized by domain in the features directory:

```
CPA/src/features/[domain]/components/
```

Examples:
- `CPA/src/features/claims/components/`
- `CPA/src/features/appointments/components/`
- `CPA/src/features/vehicles/components/`

### App Router Components

Components specific to a particular route should be placed in the App Router structure:

```
CPA/src/app/[route]/components/
```

For client components in the App Router structure, use the `.client.tsx` extension:

```
CPA/src/app/[route]/components/Component.client.tsx
```

## Component Types

### Server Components

Server components should:
- Not use client-side hooks (useState, useEffect, etc.)
- Fetch data directly using server-side methods
- Be wrapped in ErrorBoundary and Suspense components
- Pass data to client components via props

### Client Components

Client components should:
- Be marked with the "use client" directive
- Handle client-side state and interactions
- Use React hooks for state management
- Be wrapped in server components when possible

### Form Components

Form components should:
- Be organized by domain in the features directory
- Use React Hook Form for form state management
- Use Zod for validation
- Be client components (marked with "use client")
- Be wrapped in server components when used in the App Router structure

## Examples

### Domain-Specific Form Component

```
CPA/src/features/appointments/components/AppointmentForm.tsx
```

```tsx
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// ...

export function AppointmentForm({ claim, onSuccess, onCancel }: AppointmentFormProps) {
  // Client-side logic here
}
```

### Client Component Wrapper in App Router

```
CPA/src/app/claims/[id]/tabs/appointments/components/AppointmentFormWrapper.client.tsx
```

```tsx
"use client";

import { useState } from 'react';
import { AppointmentForm } from '@/features/appointments/components/AppointmentForm';
// ...

export default function AppointmentFormWrapper({ claim, onAppointmentCreated }: AppointmentFormWrapperProps) {
  // Client-side wrapper logic here
}
```

### Server Component in App Router

```
CPA/src/app/claims/[id]/tabs/appointments/AppointmentsTab.tsx
```

```tsx
import { Suspense } from "react";
import AppointmentFormWrapper from "./components/AppointmentFormWrapper.client";
// ...

export default function AppointmentsTab({ appointmentsData, claimData }: AppointmentsTabProps) {
  // Server-side logic here
  return (
    <div>
      {claim && (
        <Suspense fallback={<div>Loading form...</div>}>
          <AppointmentFormWrapper claim={claim} onAppointmentCreated={handleAppointmentCreated} />
        </Suspense>
      )}
      {/* Display appointments */}
    </div>
  );
}
```

## Benefits of This Approach

1. **Improved Organization**: Components are organized by domain, making them easier to find
2. **Better Separation of Concerns**: Clear separation between client and server components
3. **Enhanced Discoverability**: Components are placed in logical locations
4. **Increased Reusability**: Generic components are separated from domain-specific components
5. **Consistent Patterns**: Following consistent patterns makes the codebase more maintainable
