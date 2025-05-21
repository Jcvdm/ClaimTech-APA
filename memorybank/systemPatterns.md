# System Patterns: Vehicle Inspection & Claim Management App

## 1. Core Architecture

*   **Framework:** Next.js (App Router) handling routing, rendering (SSR/SSG/Client), and API routes (for tRPC).
*   **API Layer:** tRPC providing type-safe procedures callable from the frontend.
*   **Backend:** Supabase acting as the Backend-as-a-Service (BaaS).
    *   PostgreSQL database for data storage.
    *   Supabase Auth for user authentication.
    *   Direct interaction via `supabase-js` client library (within tRPC procedures).
*   **Data Access Layer (DAL):** A dedicated layer (`src/lib/api/`) implemented to abstract complex data fetching and mutation logic from UI components. Built upon TanStack Query and tRPC.
*   **UI:** React components built using Shadcn/UI methodology over Radix UI primitives and styled with Tailwind CSS.

## 2. Key Technical Decisions & Patterns

*   **Supabase Integration:**
    *   tRPC `createContext` function initializes a Supabase client instance.
    *   tRPC procedures use the Supabase client (from context) to interact with the database.
    *   `protectedProcedure` helper in tRPC enforces authentication using the Supabase session from the context.
    *   Database schema and Row Level Security (RLS) policies defined directly within Supabase.
*   **Supabase Storage:** Used for storing claim-related files (e.g., photos, documents) in a private bucket (`claim-attachments`). Basic RLS policies applied initially, stricter policies required later.
*   **Data Fetching Patterns:**
    *   **Direct tRPC Hooks:** For simpler data fetching needs, components use direct tRPC hooks like:
        ```tsx
        // Example from LocationDetailsTab.tsx
        const { data: provinces, isLoading, isError } = api.lookup.getProvinces.useQuery(undefined, {
          staleTime: Infinity,
          retry: 2,
        });
        ```
    *   **Data Access Layer (DAL):** For complex data operations, mutations with cache invalidation, and orchestration between multiple calls, the abstracted layer is used.
    *   **Mixed Pattern:** The app uses both approaches as appropriate - direct hooks for simple reads, DAL for mutations and complex operations.
*   **Data Access Layer (`src/lib/api/`):**
    *   **Goal:** Decouple UI components from complex data operations and provide standardized mutation handling with cache invalidation.
    *   **Foundation:**
        *   `client.ts`: Wraps the raw tRPC client (`api`) providing standardized options (e.g., `staleTime`) and error handling (using `sonner` toasts).
        *   `types.ts`: Shared types (`PaginatedResponse`, `FilterParams`, `QueryResult`, `ApiStatus`), re-exports tRPC types.
        *   `hooks.ts`: Base hooks (`useQueryState`, `useInfiniteData` wrapping `useInfiniteQuery`) and orchestration hooks (`useDependentQuery`, `useParallelQueries`).
        *   `utils.ts`: Utility functions (`getQueryKey`, `formatErrorMessage`, etc.).
    *   **Domains (`src/lib/api/domains/`):** Modules for specific data entities (e.g., `claims`).
        *   `types.ts`: Domain-specific types and Zod schemas.
        *   `queries.ts`: Defines wrappers around `apiClient.query` for domain-specific read operations.
        *   `mutations.ts`: Defines wrappers around `apiClient.mutation` for domain-specific write operations.
        *   `hooks.ts`: Exports hooks for UI consumption (e.g., `useCreateClaim`, `useOptimisticUpdateClaimStatus`). These hooks handle cache invalidation/updates.
*   **Data Flow (With Both Patterns):**
    *   **Simple Reads:** Frontend components use direct tRPC hooks from `api.router.procedure.useQuery()`.
    *   **Complex Operations:** Components use hooks from the DAL which orchestrate multiple calls/cache invalidations.
    *   **Validation:** Data is validated using Zod at the API boundary (tRPC input) and within DAL type definitions.
*   **State Management:**
    *   **Server State:** Managed by **TanStack Query**, accessed either directly through tRPC hooks or via the DAL.
    *   **Global Client State:** Managed by **Zustand**, primarily for authentication status (`useAuthStore`) and synchronization status (`useSyncStatusStore`). Initialization and synchronization handled by `AuthProvider`.
    *   **Local UI State:** Managed by React's built-in hooks (`useState`, `useEffect`) within individual components.
    *   **Form State:** Managed by **React Hook Form** (`useForm`) within specific form components.
    *   **Sync Status:** Managed by a dedicated Zustand store (`useSyncStatusStore`) that tracks global synchronization status for optimistic UI updates.
*   **Optimistic Updates:**
    *   Implemented within specific DAL mutation hooks (e.g., `useOptimisticUpdateClaimStatus`, `useOptimisticDeleteClaim`) using TanStack Query's `useMutation` options (`onMutate`, `onError`, `onSettled`).
*   **Component Strategy:**
    *   Use Shadcn/UI CLI to add components' source code directly to the project (`src/components/ui`).
    *   Build feature-specific and layout components by composing Shadcn/UI primitives (`src/components/layout`, `src/components/shared`).
    *   Emphasize creating reusable components like `ItemList` and `ActionButtons` to handle common data display patterns.
*   **Layout Implementation:**
    *   **Visual Target:** Follow the layout structure demonstrated in the provided image (`Zoho Billing - All Invoices` screenshot).
    *   A root `Layout` component (`src/components/layout/Layout.tsx`) orchestrates the TopBar, Sidebar, Main Content (children), and Footer.
    *   **Top Bar:** Fixed position, includes Logo (implied), Search, User Menu/Account Info, Action Buttons (e.g., + New), notification/settings icons.
    *   **Left Sidebar:** Fixed position (on desktop), contains primary navigation links.
    *   **Main Content:** Scrollable area displaying page-specific content (e.g., data tables, forms).
    *   **Footer:** Fixed position (optional, but standard).
    *   Flexbox/Grid used within `Layout` to achieve fixed/scrollable sections.
    *   Sidebar visibility likely controlled via CSS media queries (hidden on mobile, potentially collapsible).
*   **Notifications:** Sonner toasts triggered via `handleApiError` in `apiClient` and potentially within mutation `onSuccess`/`onError` callbacks in DAL hooks.
*   **Audit Trail:** Implemented via `created_by_employee_id` and `updated_by_employee_id` columns in `claims`, populated in protected tRPC mutation procedures using `ctx.user.id`.
*   **Database Logic:**
    *   **Triggers for Denormalization:** Using triggers (`update_claim_additionals_status` on `additional_lines`) to maintain denormalized flags (`claims.has_pending_additionals`) for efficient filtering.
    *   **Triggers for Auto-Generation:** Using a `BEFORE INSERT` trigger (`trg_generate_job_number`) and function (`generate_client_job_number`) on `claims` to atomically generate unique, client-specific sequential job numbers (e.g., `ABC00001`) based on counters stored in the `clients` table (`last_claim_sequence`, `code`). Relies on `SELECT ... FOR UPDATE` for locking within the trigger function.
*   **New Claim Workflow:**
    *   Requires creation of a *new* vehicle record per claim.
    *   Requires mandatory Date/Time of Loss.
    *   `onSubmit` uses a two-step mutation process (create vehicle -> create claim) via DAL hooks.
*   **File Upload Strategy (New Claim Form):**
    *   Implemented using a tabbed interface (Shadcn `Tabs`) on the `/claims/new` page.
    *   **Step 1 (Details Tab):** User submits claim/vehicle details. `createVehicle` and `createClaim` mutations run.
    *   **Step 2 (Attachments Tab):** Enabled *after* successful claim creation. User can optionally upload files directly to final storage path (`public/[claimId]/...`). Upload logic calls `attachment.create` tRPC mutation to save metadata.
*   **Claim Routing (Next.js App Router):**
    *   **List View:** `/claims` - Displays the list of claims.
    *   **New Claim Form:** `/claims/new` - Canonical route for creating a new claim. Uses `NewClaimForm` component.
    *   **Claim Details:** `/claims/[id]` - Displays details for a specific claim. The page component (`page.tsx`) validates that `id` is a valid UUID; otherwise, it returns `notFound()`. Previous workarounds to handle non-UUIDs like "new" have been removed.
    *   **Legacy Redirect:** `/new-claim` - Redirects permanently to `/claims/new`.
    *   **Breadcrumbs:** Standard pattern for `/claims/new` is `Claims > New Claim`.

## 3. Component Relationships (High Level - Revised)

```mermaid
graph TD
    App[Root Layout] --> Layout[Layout Component]

    Layout --> TopBar[TopBar]
    Layout --> Sidebar[AppSidebar]
    Layout --> MainContent[Main Content Area (Children Pages)]
    Layout --> Footer[Footer]
    Layout --> Toaster[Sonner Toaster]

    MainContent --> PageComponent[e.g., ClaimsPage]
    PageComponent --> ClaimsList[e.g., ClientClaims Component]
    ClaimsList --> DataTable[Data Table/List]
    DataTable --> ClaimItem[Claim Item/Row]
    ClaimItem --> ActionButtons[Action Buttons (Status Update, Delete)]

    %% DAL Interaction
    PageComponent --> DAL_ClaimsHooks[DAL Hooks (useClaimsList)]
    AppSidebar --> DAL_ClaimsHooksCounts[DAL Hooks (useClaimCounts)]
    ActionButtons --> DAL_ClaimsHooksMut[DAL Hooks (useOptimisticUpdateClaimStatus, useDeleteClaim)]

    DAL_ClaimsHooks --> DAL_ClaimsQueries[DAL Claims Queries]
    DAL_ClaimsHooksMut --> DAL_ClaimsMutations[DAL Claims Mutations]

    DAL_ClaimsQueries --> BaseApiClient[Base API Client (query)]
    DAL_ClaimsMutations --> BaseApiClientMut[Base API Client (mutation)]

    BaseApiClient --> trpcQueryHook[Raw tRPC Hook (useQuery)]
    BaseApiClientMut --> trpcMutationHook[Raw tRPC Hook (useMutation)]

    trpcQueryHook --> trpcRouter[tRPC Router (Server)]
    trpcMutationHook --> trpcRouter

    trpcRouter --> trpcContext[tRPC Context]
    trpcContext --> SupabaseClient[Supabase Client (Server)]
    trpcContext --> AuthUser[Authenticated User Info]
    SupabaseClient --> SupabaseDB[Supabase Database]

```

## 4. Core Dashboard Layout (`Layout.tsx`, `TopBar.tsx`, `AppSidebar.tsx`)

*   **Pattern:** "L-shaped" layout with fixed sidebar on the left and a vertical stack (topbar, content, footer) beside it.
*   **Visual Reference:** Based on the Zoho Billing screenshot and detailed in `prompt/prd_layout.md`.
*   **Implementation Structure (`app/layout.tsx`):**
    *   The root layout (`app/layout.tsx`) wraps the core structure with `<TRPCReactProvider>` and `<SidebarProvider>`.
    *   Inside `<SidebarProvider>`, the `<Layout />` component contains both sidebar and content areas.
*   **Implementation Details (`Layout.tsx`):**
    *   Uses an "L-shaped" layout approach with `flex` for the main container.
    *   Sidebar is fixed to the left side, occupying full height.
    *   The right side forms a vertical stack with TopBar, content area, and footer.
    *   The content area is scrollable while sidebar, topbar, and footer remain fixed.
    *   Clear separation between the sidebar and the topbar/content/footer stack.
*   **Navigation/Content Change:** Content in the main area (`{children}` rendered inside content area) is changed via standard Next.js App Router navigation. Links within `AppSidebar.tsx` trigger route changes. The primary "+ New" button links to `/claims/new`.
*   **Sidebar Content:** Updated to reflect workflow steps (Claims, Additionals, FRC, Finalized, History, Clients, Repairers). Includes badges for counts fetched via DAL hooks.
*   **Responsiveness:** The sidebar supports both expanded and collapsed states via the Shadcn UI `Sidebar` component's functionality. Mobile responsiveness is handled through the sidebar component's built-in behavior.

## Logging System Architecture

### Database Structure
- **Table**: `claim_logs` with columns for `id`, `claim_id`, `user_id`, `log_type`, `message`, `details`, and `created_at`
- **Indexes**: Created on `claim_id`, `created_at`, and `log_type` for efficient querying
- **RLS Policies**: Configured to allow authenticated users to select and insert logs

### Log Types
- **Claim Events**: `CLAIM_CREATED`, `CLAIM_UPDATED`, `CLAIM_STATUS_CHANGED`
- **Appointment Events**: `APPOINTMENT_CREATED`, `APPOINTMENT_UPDATED`, `APPOINTMENT_CANCELED`, `APPOINTMENT_RESCHEDULED`
- **Inspection Events**: `INSPECTION_STARTED`, `INSPECTION_COMPLETED`
- **Estimate Events**: `ESTIMATE_CREATED`, `ESTIMATE_UPDATED`
- **Additional Events**: `ADDITIONAL_CREATED`, `ADDITIONAL_APPROVED`, `ADDITIONAL_REJECTED`
- **Manual Logs**: `MANUAL_LOG` for user-added notes

### Integration Points
- **Claim Creation**: Logs created automatically when a claim is created
- **Status Changes**: Logs created when claim status is updated
- **Appointments**: Logs created when appointments are created, updated, or rescheduled
- **Inspections**: Logs created when inspections are started or completed
- **Manual Entry**: UI component allows users to add manual notes to the log

### UI Components
- **LogsCard**: Main component that displays logs and allows adding manual entries
- **LogEntry**: Component for rendering individual log entries with appropriate formatting
- **Placement**: Integrated into the Overview tab of claim details

## Data Fetching Architecture

### Prefetching System
- **Query Key Structure**: Standardized using `[['trpc', router, procedure], { input: { ...input }, type: 'query' }]`
- **Cache Management**: Three-layer check (data existence, freshness, fetch state)
- **Deduplication**: Queue system with Set-based tracking
- **Logging**: Detailed cache state visibility

### Claim Details Flow
1. **ID Validation**:
   - Client-side UUID check
   - Invalid IDs trigger immediate redirect
2. **Loading States**:
   - Skeleton UI during validation
   - Error boundaries for failed validation
3. **Data Flow**:
   - Parallel validation and prefetching
   - Cache-first approach with network fallback

### Performance Patterns
- Default 5min staleTime / 10min cacheTime
- Priority-based prefetch scheduling
- Centralized prefetch management via ClaimPrefetchManager

## Tab Component Architecture

### Tab Structure
- **Navigation**: TabsList with TabsTrigger components for each tab
- **Content**: TabsContent components with specific tab components
- **Layout**: Consistent layout with title, card, and content sections

### Tab Components
1. **SummaryTab**: Overview of claim details and activity logs
2. **AppointmentTab**: Appointment scheduling and tracking
3. **InspectionTab**: Vehicle inspection details with integrated 360° view
4. **EstimateTab**: Repair cost estimates with form for creating estimates
5. **PreIncidentTab**: Pre-incident condition reporting (placeholder)
6. **HistoryTab**: Claim history (placeholder, logs moved to Overview tab)

### Tab Component Pattern
```tsx
export function TabNameTab({ claim }: TabNameTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Tab Title</h2>
      <Card>
        <CardHeader>
          <CardTitle>Section Title</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Tab-specific content */}
        </CardContent>
      </Card>
    </div>
  );
}
```

## Estimate Form Architecture

### Core Components
1. **EstimateForm**: Main component for creating new estimates
   - Handles form state with React Hook Form
   - Uses Shadcn UI form components
   - Implements proper validation and error handling
   - Formats currency values with decimal places
   - Removes increment/decrement arrows from numeric inputs
   - Adjusts field sizes based on content type

2. **EstimateSummary**: Component for displaying estimate details
   - Shows rates, markups, and cost breakdown
   - Formats numbers with proper decimal places
   - Handles null values gracefully
   - Provides clear visual organization of estimate data

3. **EstimateLineForm**: Component for adding estimate line items
   - Supports different process types (New, Repair, etc.)
   - Includes fields for parts, labor, paint, and other costs
   - Implements proper validation and error handling

### Estimate Form Pattern
```tsx
// EstimateForm - Component for creating new estimates
export function EstimateForm({ claimId, onCancel }: EstimateFormProps) {
  const createEstimate = useCreateEstimate();

  const form = useForm<EstimateCreate>({
    resolver: zodResolver(EstimateCreateSchema),
    defaultValues: {
      claim_id: claimId,
      vat_rate_percentage: 15,
      panel_labor_rate: 350.00, // Single labor rate for all labor types
      paint_material_rate: 2000.00, // Per panel rate (no markup)
      special_markup_percentage: 25, // Special services markup
      part_markup_percentage: 25, // Markup only on parts
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Estimate</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form fields with proper formatting and validation */}
              <FormField
                control={form.control}
                name="panel_labor_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Labor Rate (per hour)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="text-right"
                        value={field.value.toFixed(2)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          field.onChange(parseFloat(value) || 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Additional form fields */}
            </div>
            {/* Submit buttons */}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
```

## Photo Component Architecture

### Core Components
1. **StorageImage**: Base component for displaying images from Supabase Storage
   - Handles URL generation and caching
   - Supports various display options (width, height, objectFit)
   - Implements forwardRef for DOM access

2. **ImagePreview**: Enhanced modal for viewing and interacting with images
   - Window-like resizing with react-rnd
   - Zoom and pan capabilities
   - Aspect ratio preservation
   - Session state persistence
   - Implements mount state tracking to prevent auto-opening
   - Uses unique keys to isolate component instances

3. **ImagePreviewWrapper**: Wrapper component for ImagePreview
   - Ensures proper isolation of dialog state
   - Forces React to create new instances when filePath changes
   - Prevents issues with automatic dialog opening

4. **PhotoUploadCard**: Component for uploading and displaying photos
   - Drag-and-drop functionality
   - Preview capability
   - Delete and download options
   - Uses ImagePreviewWrapper to prevent dialog state issues

### Photo Component Pattern
```tsx
// StorageImage - Base component for displaying images
export const StorageImage = forwardRef<HTMLImageElement, StorageImageProps>(({
  bucketName = "claim-attachments",
  filePath,
  alt,
  ...props
}, ref) => {
  // Image URL generation and rendering logic
});

// ImagePreview - Enhanced modal for viewing images
export function ImagePreview({ bucketName, filePath, alt, children }: ImagePreviewProps) {
  // Track component mount state to prevent auto-opening
  const [isMounted, setIsMounted] = useState(false);

  // State for size, position, zoom, pan
  const [isOpen, setIsOpen] = useState(false);

  // Set mounted state on component mount
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Reset dialog state when filePath changes
  useEffect(() => {
    if (isMounted) {
      setIsOpen(false);
    }
  }, [filePath, isMounted]);

  return (
    <Dialog
      key={`dialog-${filePath}`}
      open={isMounted ? isOpen : false}
      onOpenChange={(open) => {
        if (isMounted) {
          setIsOpen(open);
        }
      }}
    >
      <DialogTrigger>{children}</DialogTrigger>
      <Rnd
        size={size}
        position={position}
        lockAspectRatio={aspectRatio}
        // Other configuration
      >
        {/* Image and controls */}
      </Rnd>
    </Dialog>
  );
}

// ImagePreviewWrapper - Wrapper to isolate dialog state
export function ImagePreviewWrapper({ bucketName, filePath, alt, children }: ImagePreviewWrapperProps) {
  // Generate a unique key based on the filePath
  const instanceKey = `image-preview-${filePath}`;

  return (
    <ImagePreview
      key={instanceKey}
      bucketName={bucketName}
      filePath={filePath}
      alt={alt}
    >
      {children}
    </ImagePreview>
  );
}

// PhotoUploadCard - Component for uploading and displaying photos
export function PhotoUploadCard({
  title,
  imagePath,
  onImagePathChange,
  ...props
}: PhotoUploadCardProps) {
  // Upload, delete, and download functionality
  return (
    <div>
      {imagePath ? (
        <ImagePreview>
          <StorageImage />
        </ImagePreview>
      ) : (
        <DropzoneArea />
      )}
    </div>
  );
}
```