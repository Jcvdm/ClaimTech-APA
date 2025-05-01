# Vehicle Inspection Process

## Overview

The vehicle inspection process is a critical part of the claims management workflow. It allows claims handlers to record when a vehicle inspection is performed, which updates the claim status and stores the inspection date/time for future reference.

## Implementation Details

### Database Schema

#### Current Implementation
The basic vehicle inspection data is stored in the `claims` table with the following fields:

- `inspection_datetime`: A timestamp field that records when the inspection was performed
- `status`: Updated to "In Progress" when an inspection is recorded (previously used "Inspection Done", now replaced)

#### Planned Enhancement
A dedicated `vehicle_inspections` table will be created to store more detailed inspection data:

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
      // Implementation details...
    }),

  // Get inspections by claim ID
  getByClaim: protectedProcedure
    .input(InspectionGetByClaimInputSchema)
    .output(z.array(InspectionOutputSchema))
    .query(async ({ ctx, input }) => {
      // Implementation details...
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

The inspections domain includes a server-side prefetching function:

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

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    // Fetch inspections
    const inspections = await caller.inspection.getByClaim({ claim_id: claimId });

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
```

#### Client-Side Hooks

The inspections domain provides hooks for components to use:

```typescript
// src/lib/api/domains/inspections/hooks.ts
export function useInspectionsByClaim(claimId: string | null | undefined) {
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
      }
    )
  );
}

export function useCreateInspection() {
  const queryClient = useQueryClient();

  return inspectionMutations.createInspection({
    onSuccess: (data) => {
      // Cache invalidation logic...
    },
  });
}

export function useRecordInspection() {
  const queryClient = useQueryClient();

  return inspectionMutations.recordInspection({
    onSuccess: (updatedClaim) => {
      // Cache invalidation logic...
    },
  });
}
```

### UI Components

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

## Planned Enhancements

A comprehensive vehicle inspection form is planned with the following features:

1. **360° Vehicle Photos**: Upload photos from 8 different angles around the vehicle
2. **Registration Details**: Capture registration number and photo
3. **License Disc Details**: Record license disc presence, expiry date, and photo
4. **VIN Details**: Capture VIN number and photos of VIN on dash, plate, and number
5. **Notes**: Add general notes about the inspection

The form will use drag-and-drop file uploads with preview functionality and will store photos in a dedicated Supabase storage bucket.

A detailed PRD for this enhancement is available at `@prompt/vehicle_inspection_prd.md`.
