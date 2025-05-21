# Vehicle Inspection Process

## Overview

The vehicle inspection process is a critical part of the claims management workflow. It allows claims handlers to record when a vehicle inspection is performed, which updates the claim status and stores the inspection date/time for future reference.

## Recent Updates

### Optimized Inspection Form Layout (2024-08-05)

1. **Side-by-Side Layout for Registration and License Disc**:
   - Created a new `RegistrationLicenseWrapper` component that places both sections side by side in a 2-column grid
   - Updated the `InspectionTabContent` to use the new wrapper component
   - This layout is responsive, stacking vertically on mobile and displaying side by side on larger screens

2. **Removed Redundant Components**:
   - Removed the `DamageSection` component as it duplicated functionality already present in the 360° view
   - Removed the `VehicleOverviewSection` component as it didn't provide significant value to the inspection process
   - Removed the separate 360° view tab as the 360° view is already part of the inspection tab
   - This streamlined the UI and reduced code complexity

3. **Improved Photo Upload Components**:
   - Updated the `PhotoUploadCard` component to use consistent sizing and styling
   - Added proper labels above each upload component
   - Ensured consistent spacing and alignment across all sections

### Redesigned Inspection Tab with Vertical Layout and Row-Based 360° View (2024-05-03)

1. **Replaced Tabbed Interface with Vertical Layout**:
   - Implemented a vertical, scrollable layout with sections stacked instead of tabs
   - Each section is automatically visible without requiring clicks
   - Added proper error boundaries for each section

2. **Implemented Row-Based 360° View**:
   - Replaced the diagram-based UI with a row of cards for each angle
   - Organized the cards in a responsive grid (4 cards per row on desktop)
   - Each card shows a preview if an image exists or has been uploaded

3. **Added Drag-and-Drop Photo Uploads**:
   - Implemented a reusable PhotoUploadCard component
   - Added support for drag-and-drop file uploads
   - Implemented file preview functionality

4. **Implemented Scroll-Based Prefetching**:
   - Used native IntersectionObserver API to detect when sections come into view
   - Prefetches data for sections just before they're visible
   - Improves performance by loading data only when needed

5. **Fixed Dependency Issues**:
   - Avoided adding new dependencies that would conflict with React 19
   - Used native browser APIs instead of external libraries where possible
   - Ensured compatibility with the existing codebase

### Previous Updates

1. **Removed Redundant Files**:
   - Removed the redundant src directory outside the CPA directory
   - This ensures all code is properly organized within the CPA directory

2. **Added Missing Dependencies**:
   - Installed react-error-boundary for proper error handling
   - Installed uuid for generating unique identifiers for uploaded files

3. **Updated Error Handling**:
   - Updated the InspectionFormWrapper to use the custom ErrorBoundary component from the UI components directory
   - This ensures consistent error handling across the application

## Implementation Details

### Database Schema

#### Current Implementation
The basic vehicle inspection data is stored in the `claims` table with the following fields:

- `inspection_datetime`: A timestamp field that records when the inspection was performed
- `status`: Updated to "In Progress" when an inspection is recorded (previously used "Inspection Done", now replaced)

#### Enhanced Implementation
A dedicated `vehicle_inspections` table has been created to store more detailed inspection data:

```sql
CREATE TABLE vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  inspection_datetime TIMESTAMPTZ NOT NULL,
  inspector_id UUID NOT NULL REFERENCES employees(id),

  -- Registration details
  registration_number TEXT,
  registration_photo_path TEXT,

  -- License disc details
  license_disc_present BOOLEAN DEFAULT FALSE,
  license_disc_expiry DATE,
  license_disc_photo_path TEXT,

  -- VIN details
  vin_number TEXT,
  vin_dash_photo_path TEXT,
  vin_plate_photo_path TEXT,
  vin_number_photo_path TEXT,

  -- 360 view photos
  front_view_photo_path TEXT,
  right_front_view_photo_path TEXT,
  right_side_view_photo_path TEXT,
  right_rear_view_photo_path TEXT,
  rear_view_photo_path TEXT,
  left_rear_view_photo_path TEXT,
  left_side_view_photo_path TEXT,
  left_front_view_photo_path TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Layer

The inspection functionality follows the Data Access Layer (DAL) pattern used throughout the application.

#### Domain Structure

The inspections domain has the following structure:

- `src/lib/api/domains/inspections/types.ts` - Defines inspection-specific types
- `src/lib/api/domains/inspections/constants.ts` - Defines query keys and cache times
- `src/lib/api/domains/inspections/hooks.ts` - Provides React hooks for components
- `src/lib/api/domains/inspections/mutations.ts` - Handles data modification operations
- `src/lib/api/domains/inspections/server-prefetch.server.ts` - Handles server-side prefetching
- `src/lib/api/domains/inspections/index.ts` - Re-exports everything for convenient imports

#### Types

The inspections domain defines the following types:

```typescript
// src/lib/api/domains/inspections/types.ts
export interface Inspection {
  id: string;
  claim_id: string;
  vehicle_id: string;
  inspection_datetime: string;
  inspector_id: string;

  // Registration details
  registration_number?: string;
  registration_photo_path?: string;

  // License disc details
  license_disc_present: boolean;
  license_disc_expiry?: string;
  license_disc_photo_path?: string;

  // VIN details
  vin_number?: string;
  vin_dash_photo_path?: string;
  vin_plate_photo_path?: string;
  vin_number_photo_path?: string;

  // 360 view photos
  front_view_photo_path?: string;
  right_front_view_photo_path?: string;
  right_side_view_photo_path?: string;
  right_rear_view_photo_path?: string;
  rear_view_photo_path?: string;
  left_rear_view_photo_path?: string;
  left_side_view_photo_path?: string;
  left_front_view_photo_path?: string;

  // Metadata
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInspectionInput {
  claim_id: string;
  vehicle_id: string;
  inspection_datetime?: Date;

  // Registration details
  registration_number?: string;
  registration_photo_path?: string;

  // License disc details
  license_disc_present?: boolean;
  license_disc_expiry?: Date;
  license_disc_photo_path?: string;

  // VIN details
  vin_number?: string;
  vin_dash_photo_path?: string;
  vin_plate_photo_path?: string;
  vin_number_photo_path?: string;

  // 360 view photos
  front_view_photo_path?: string;
  right_front_view_photo_path?: string;
  right_side_view_photo_path?: string;
  right_rear_view_photo_path?: string;
  rear_view_photo_path?: string;
  left_rear_view_photo_path?: string;
  left_side_view_photo_path?: string;
  left_front_view_photo_path?: string;

  // Metadata
  notes?: string;
}
```

#### Server-Side

The server-side API includes a dedicated tRPC router for inspections:

```typescript
// src/server/api/routers/inspection.ts
export const inspectionRouter = createTRPCRouter({
  // Create a new inspection
  create: protectedProcedure
    .input(InspectionCreateInputSchema)
    .output(InspectionOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { claim_id, vehicle_id, ...inspectionData } = input;

        // Set default values
        const inspection_datetime = inspectionData.inspection_datetime || new Date();

        // Create the inspection record
        const { data, error } = await ctx.supabase
          .from('vehicle_inspections')
          .insert({
            claim_id,
            vehicle_id,
            inspection_datetime: inspection_datetime.toISOString(),
            inspector_id: ctx.user.id,
            ...inspectionData,
          })
          .select('*')
          .single();

        if (error) {
          throw new Error(`Error creating inspection: ${error.message}`);
        }

        // Update the claim status to In Progress
        await ctx.supabase
          .from('claims')
          .update({
            status: ClaimStatus.IN_PROGRESS,
            inspection_datetime: inspection_datetime.toISOString(),
            updated_by_employee_id: ctx.user.id
          })
          .eq('id', claim_id);

        return data;
      } catch (error) {
        console.error('Error creating inspection:', error);
        throw error;
      }
    }),

  // Get inspections by claim ID
  getByClaim: protectedProcedure
    .input(InspectionGetByClaimInputSchema)
    .output(z.array(InspectionOutputSchema))
    .query(async ({ ctx, input }) => {
      try {
        const { claim_id } = input;

        const { data, error } = await ctx.supabase
          .from('vehicle_inspections')
          .select('*')
          .eq('claim_id', claim_id)
          .order('created_at', { ascending: false });

        if (error) {
          throw new Error(`Error fetching inspections: ${error.message}`);
        }

        return data || [];
      } catch (error) {
        console.error('Error fetching inspections:', error);
        throw error;
      }
    }),

  // Get inspection by ID
  getById: protectedProcedure
    .input(InspectionGetByIdInputSchema)
    .output(InspectionOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { id } = input;

        const { data, error } = await ctx.supabase
          .from('vehicle_inspections')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          throw new Error(`Error fetching inspection: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('Error fetching inspection:', error);
        throw error;
      }
    }),
});
```

For backward compatibility, the claim router still includes the original recordInspection procedure:

```typescript
// In claim.ts router
recordInspection: protectedProcedure
  .input(ClaimRecordInspectionInputSchema)
  .output(ClaimWithRelationsOutputSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const { id, inspection_datetime } = input;

      // Map the old input format to the new format (id -> claim_id)
      const claim_id = id;

      // Add audit trail and update status to In Progress
      const { data, error } = await ctx.supabase
        .from('claims')
        .update({
          status: ClaimStatus.IN_PROGRESS,
          inspection_datetime: inspection_datetime.toISOString(),
          updated_by_employee_id: ctx.user.id
        })
        .eq('id', claim_id)
        .select('...')
        .single();

      // Error handling and return data
    } catch (error) {
      // Error handling
    }
  })
```

#### Server-Side Prefetching

The inspections domain includes server-side prefetching functions:

```typescript
// src/lib/api/domains/inspections/server-prefetch.server.ts
export const prefetchInspectionsByClaimServer = cache(async (claimId: string) => {
  try {
    console.log(`[Server Prefetch] Prefetching inspections for claim ${claimId}`);

    // Get the query client for hydration
    const queryClient = getQueryClient();

    // Check if we already have fresh data in the cache
    const queryKey = QUERY_KEYS.TRPC.GET_BY_CLAIM(claimId);
    const cachedData = queryClient.getQueryData(queryKey);
    const isCachedDataFresh = queryClient.getQueryState(queryKey)?.dataUpdatedAt > Date.now() - 5 * 60 * 1000; // 5 minutes

    if (cachedData && isCachedDataFresh) {
      console.log(`[Server Prefetch] Using cached inspections data for claim ${claimId}`);
      return cachedData;
    }

    // Fetch inspections using serverTrpc
    const inspections = await serverTrpc.inspection.getByClaim({ claim_id: claimId })
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching inspections for claim ${claimId}:`, error);
        return [];
      });

    // Hydrate the query client with the inspections data
    queryClient.setQueryData(queryKey, inspections);
    queryClient.setQueryData(QUERY_KEYS.byClaim(claimId), inspections);

    console.log(`[Server Prefetch] Successfully prefetched ${inspections.length} inspections for claim ${claimId}`);
    return inspections;
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching inspections for claim ${claimId}:`, error);
    return [];
  }
});

// Comprehensive prefetch function for the inspection form
export const prefetchInspectionFormDataServer = cache(async (claimId: string) => {
  try {
    console.log(`[Server Prefetch] Prefetching all data for inspection form for claim ${claimId}`);

    // Get the query client for hydration
    const queryClient = getQueryClient();

    // Prefetch claim data
    const claim = await serverTrpc.claim.getById({ id: claimId })
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching claim ${claimId}:`, error);
        return null;
      });

    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    // Set claim data in the query client
    queryClient.setQueryData(
      CLAIM_QUERY_KEYS.TRPC.GET_BY_ID(claimId),
      claim
    );
    queryClient.setQueryData(
      CLAIM_QUERY_KEYS.detail(claimId),
      claim
    );

    // Prefetch vehicle data if available
    if (claim.vehicle_id) {
      const vehicle = await serverTrpc.vehicle.getById({ id: claim.vehicle_id })
        .catch((error: Error) => {
          console.error(`[Server Prefetch] Error fetching vehicle ${claim.vehicle_id}:`, error);
          return null;
        });

      if (vehicle) {
        // Set vehicle data in the query client
        queryClient.setQueryData(
          VEHICLE_QUERY_KEYS.TRPC.GET_BY_ID(claim.vehicle_id),
          vehicle
        );
        queryClient.setQueryData(
          VEHICLE_QUERY_KEYS.detail(claim.vehicle_id),
          vehicle
        );
      }
    }

    // Prefetch inspections
    await prefetchInspectionsByClaimServer(claimId);

    console.log(`[Server Prefetch] Successfully prefetched all data for inspection form for claim ${claimId}`);
    return true;
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching data for inspection form for claim ${claimId}:`, error);
    return false;
  }
});
```

#### Mutations

The inspections domain defines mutations for data modification:

```typescript
// src/lib/api/domains/inspections/mutations.ts
export const inspectionMutations = {
  createInspection: (options?: UseMutationOptions<Inspection, Error, CreateInspectionInput>) => {
    return useMutation({
      mutationFn: async (input: CreateInspectionInput) => {
        const result = await apiClient.raw.inspection.create.mutate(input);
        return result;
      },
      ...options,
    });
  },

  recordInspection: (options?: UseMutationOptions<Claim, Error, RecordInspectionInput>) => {
    return useMutation({
      mutationFn: async (input: RecordInspectionInput) => {
        const result = await apiClient.raw.claim.recordInspection.mutate(input);
        return result;
      },
      ...options,
    });
  },
};
```

#### Constants and Query Keys

The inspections domain defines query keys and cache times for consistent data fetching:

```typescript
// src/lib/api/domains/inspections/constants.ts
export const INSPECTION_CACHE_TIMES = {
  STALE_TIME: 5 * 60 * 1000, // 5 minutes
  GC_TIME: 10 * 60 * 1000, // 10 minutes
};

export const QUERY_KEYS = {
  // Client-side query keys
  all: ['inspections'] as const,
  byClaim: (claimId: string) => [...QUERY_KEYS.all, 'byClaim', claimId] as const,
  detail: (id: string) => [...QUERY_KEYS.all, 'detail', id] as const,

  // tRPC query keys
  TRPC: {
    all: ['inspection'] as const,
    GET_BY_CLAIM: (claimId: string) =>
      [...QUERY_KEYS.TRPC.all, 'getByClaim', { claim_id: claimId }] as const,
    GET_BY_ID: (id: string) =>
      [...QUERY_KEYS.TRPC.all, 'getById', { id }] as const,
  },
};
```

#### Client-Side Hooks

The inspections domain provides hooks for components to use:

```typescript
// src/lib/api/domains/inspections/hooks.ts
export function useInspectionsByClaim(claimId: string | null | undefined, options?: UseQueryOptions<Inspection[]>) {
  // Only fetch if we have a claim ID
  const shouldFetch = !!claimId;

  return useQueryState(() =>
    apiClient.query<Inspection[]>(
      () => apiClient.raw.inspection.getByClaim.useQuery({ claim_id: claimId || '' }),
      {
        enabled: shouldFetch,
        staleTime: INSPECTION_CACHE_TIMES.STALE_TIME,
        gcTime: INSPECTION_CACHE_TIMES.GC_TIME,
        refetchOnWindowFocus: false,
        refetchInterval: undefined,
        ...options,
      }
    )
  );
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return inspectionMutations.createInspection({
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.byClaim(variables.claim_id),
      });

      // Invalidate claim details to update status
      queryClient.invalidateQueries({
        queryKey: CLAIM_QUERY_KEYS.detail(variables.claim_id),
      });

      // Show success toast
      toast.success("Inspection saved successfully");
    },
    onError: (error) => {
      console.error("Error creating inspection:", error);
      toast.error("Failed to save inspection");
    }
  });
}

export function useRecordInspection() {
  const queryClient = useQueryClient();

  return inspectionMutations.recordInspection({
    onSuccess: (updatedClaim) => {
      // Invalidate related queries
      if (updatedClaim?.id) {
        queryClient.invalidateQueries({
          queryKey: CLAIM_QUERY_KEYS.detail(updatedClaim.id),
        });

        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.byClaim(updatedClaim.id),
        });
      }
    },
  });
}
```

### UI Components

#### Basic Inspection Recording

The inspection tab has two implementations, both updated to use the new DAL pattern:

1. **App Router Version** (`CPA/src/app/claims/[id]/tabs/inspection/InspectionTab.tsx`):
   ```typescript
   import { useClaimFullDetails } from "@/lib/api/domains/claims/hooks";
   import { useRecordInspection } from "@/lib/api/domains/inspections/hooks";

   // Component implementation...

   const handleRecordInspection = async () => {
     try {
       setIsRecording(true);
       const now = new Date();

       const result = await recordInspection.mutateAsync({
         claim_id: claimId,
         inspection_datetime: now
       });

       // Success handling...
     } catch (error) {
       // Error handling...
     } finally {
       setIsRecording(false);
     }
   };
   ```

2. **Client Component Version** (`CPA/src/features/claims/components/ClaimDetails/TabContent/InspectionTab.tsx`):
   ```typescript
   import { useRecordInspection } from "@/lib/api/domains/inspections/hooks";

   // Component implementation...

   const handleRecordInspection = async () => {
     try {
       setIsRecording(true);
       const now = new Date();

       const result = await recordInspection.mutateAsync({
         claim_id: claim.id,
         inspection_datetime: now
       });

       // Success handling...
     } catch (error) {
       // Error handling...
     } finally {
       setIsRecording(false);
     }
   };
   ```

#### Comprehensive Inspection Form

The comprehensive inspection form consists of several components:

1. **InspectionTabContent** (`CPA/src/app/claims/[id]/tabs/inspection/InspectionTabContent.tsx`):
   - The main component that combines all the section components
   - Uses a vertical, scrollable layout with sections stacked
   - Handles form state and submission
   - Implements scroll-based prefetching with IntersectionObserver

2. **PhotoUploadCard** (`CPA/src/components/inspection/PhotoUploadCard.tsx`):
   - Reusable component for drag-and-drop photo uploads
   - Shows a preview if an image exists or has been uploaded
   - Handles file validation and preview generation

3. **Section Components**:
   - **InspectionHeader** (`CPA/src/components/inspection/sections/InspectionHeader.tsx`):
     - Shows inspection status, date, and basic info
     - Provides a button to record a new inspection if none exists

   - **RegistrationLicenseWrapper** (`CPA/src/components/inspection/sections/RegistrationLicenseWrapper.tsx`):
     - Wraps the RegistrationSection and LicenseDiscSection in a 2-column grid
     - Provides a responsive layout that stacks on mobile and displays side by side on larger screens

   - **RegistrationSection** (`CPA/src/components/inspection/sections/RegistrationSection.tsx`):
     - Captures registration number and photo
     - Uses the PhotoUploadCard component for file upload

   - **LicenseDiscSection** (`CPA/src/components/inspection/sections/LicenseDiscSection.tsx`):
     - Records license disc presence, expiry date, and photo
     - Uses a date picker for expiry date selection

   - **VinSection** (`CPA/src/components/inspection/sections/VinSection.tsx`):
     - Captures VIN number and photos of VIN from different locations
     - Uses three cards in a row for the different VIN photo types

   - **ThreeSixtyViewSection** (`CPA/src/components/inspection/sections/ThreeSixtyViewSection.tsx`):
     - Allows uploading photos from 8 different angles around the vehicle
     - Uses a grid of cards (4 per row) for the different angles

   - **NotesSection** (`CPA/src/components/inspection/sections/NotesSection.tsx`):
     - Allows adding general notes about the inspection
     - Provides a save button for the entire form

4. **useSupabaseStorage** (`CPA/src/hooks/useSupabaseStorage.ts`):
   - Custom hook for handling file uploads to Supabase storage
   - Provides functions for uploading and deleting files

All sections are automatically visible without requiring clicks, providing a seamless user experience.

### User Flow

1. User navigates to a claim's inspection tab
2. If no inspection has been recorded, the user sees a button to "Record Inspection"
3. When the button is clicked, the current date/time is captured
4. The claim status is updated to "In Progress"
5. The UI updates to show the inspection date/time and success message
6. On subsequent visits, the inspection details are displayed

## Status Workflow

The claim status workflow has been updated to use "In Progress" instead of "Inspection Done":

```
New -> Appointed -> In Progress -> Report Sent -> Authorized -> ...
```

This change better reflects the actual workflow, as the claim is still being processed after the inspection is performed.

## Comprehensive Vehicle Inspection Form

A comprehensive vehicle inspection form has been implemented with the following features:

1. **360° Vehicle Photos**: Upload photos from 8 different angles around the vehicle
2. **Registration Details**: Capture registration number and photo
3. **License Disc Details**: Record license disc presence, expiry date, and photo
4. **VIN Details**: Capture VIN number and photos of VIN on dash, plate, and number
5. **Notes**: Add general notes about the inspection

The form uses file uploads with preview functionality and stores photos in the Supabase storage bucket named `claim-attachments` with a consistent path structure: `claims/{claimId}/inspections/{inspectionId}/{section}/{type}`.

### Implementation Details

The implementation includes the following components:

1. **useSupabaseStorage Hook**: A custom hook for handling file uploads to Supabase storage
   - Uses the Zustand auth store to get the authenticated user
   - Handles development mode with a mock user ID
   - Includes proper error handling and logging
   - Creates a direct Supabase client with the correct options

2. **PhotoUploadCard Component**: A reusable component for drag-and-drop photo uploads
   - Uses the `useSupabaseStorage` hook for file operations
   - Provides a consistent UI for all photo uploads
   - Handles file validation and preview generation

3. **Section Components**:
   - **RegistrationSection**: Captures registration number and photo
   - **LicenseDiscSection**: Records license disc presence, expiry date, and photo
   - **VinSection**: Captures VIN number and photos of VIN from different locations
   - **ThreeSixtyViewSection**: Allows uploading photos from 8 different angles around the vehicle
   - **InteriorSection**: Captures interior photos and details
   - **MechanicalSection**: Records mechanical and electrical condition
   - **TyresSection**: Captures tyre details and photos

The form is accessible from the inspection tab via a "View/Edit Details" button for existing inspections or a "Full Form" button for new inspections.

### Future Enhancements

Planned future enhancements include:

1. **Inspection Report View**: A detailed view of the inspection data for reporting purposes
2. **Edit Existing Inspections**: The ability to edit existing inspections
3. **Gallery View**: A gallery view for inspection photos
4. **Export Functionality**: The ability to export inspection reports in various formats

A detailed PRD for the implementation is available at `@prompt/vehicle_inspection_prd.md`.
