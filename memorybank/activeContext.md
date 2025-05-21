# Active Context

## Current Focus: Estimate Editor Enhancements and UI Improvements

We've enhanced the estimate editor with improved UI, keyboard navigation, decimal value handling, and a global synchronization status indicator. We've also fixed issues with the photo preview component and appointment form.

### 1. Implemented Global Synchronization Status Indicator

We've implemented a global synchronization status indicator for the estimate editor that provides unobtrusive feedback about the overall sync state between client and server:

**Key Components:**
- **Zustand Store**: Created a dedicated Zustand store for tracking synchronization status
- **Status Indicator Component**: Implemented a non-intrusive indicator that appears at the top of the page
- **Status Tracking**: Shows "Syncing..." during changes and "All changes saved" when complete
- **Error Handling**: Displays error messages when sync operations fail
- **Automatic Cleanup**: Success and error messages automatically clear after appropriate delays
- **Multiple Operation Tracking**: Aggregates multiple concurrent sync operations into a single status
- **Unobtrusive Design**: Fixed position in the top-right corner with subtle styling
- **Accessibility**: Added proper ARIA attributes for screen readers

### 2. Enhanced Estimate Editor with Keyboard Navigation and Decimal Handling

We've implemented comprehensive improvements to the estimate line editor to function more like a spreadsheet:

**Key Components:**
- **Keyboard Navigation**: Added Tab/Shift+Tab, arrow keys, and Enter key navigation between cells
- **Decimal Value Handling**: Fixed issues with decimal values like "0.5" being incorrectly converted to "0.01"
- **Focus Management**: Implemented proper focus tracking and visual indicators for the active cell
- **Text Selection**: Auto-selects text when focusing on a cell for easier editing
- **Cursor Position**: Maintains cursor position during editing for better user experience
- **Input Validation**: Enhanced validation for numeric fields with support for both comma and period as decimal separators
- **Optimistic UI**: Maintains the spreadsheet-like experience with immediate local updates
- **Dual-State Management**: Preserves the existing dual-state system that maintains user input during server synchronization

### 3. Fixed ImagePreview Auto-Opening Issue

We've implemented a comprehensive solution to fix the issue where the ImagePreview component automatically opened when clicking on the inspection tab:

**Key Components:**
- **ImagePreviewWrapper Component**: Created a wrapper component to isolate dialog state and ensure proper component lifecycle
- **Mount State Tracking**: Implemented tracking to prevent auto-opening during component initialization
- **Unique Keys**: Added unique keys to force React to create new instances when filePath changes
- **Reset Effects**: Added effects to ensure dialog is closed when component mounts or filePath changes
- **Controlled Dialog Mode**: Implemented fully controlled mode for the Dialog component to prevent unexpected state changes
- **Component Updates**: Updated all components using ImagePreview to use the new wrapper component
- **Performance Optimization**: Removed console logs that might cause performance issues
- **Root Cause Solution**: Implemented a comprehensive solution that addresses the underlying issues rather than symptoms

### 4. Enhanced Photo Preview Modal with Window-like Functionality

We've implemented a comprehensive enhancement to the photo preview modal to provide a more desktop-like experience:

**Key Components:**
- **Resizable Modal**: Added resize handles to all corners and edges using react-rnd library
- **Aspect Ratio Preservation**: Maintained image aspect ratio during resizing
- **Size Constraints**: Implemented minimum and maximum size constraints for usability
- **Session Persistence**: Ensured resized state persists during the current session
- **Maximize/Restore**: Added a button to toggle between default and full-screen views
- **Improved Panning**: Modified panning behavior to only activate when zoomed in and clicking directly on the image
- **Widescreen Optimization**: Enhanced aspect ratio handling for better display on widescreen monitors
- **Visual Indicators**: Added clear visual cues for available interactions (zoom level, pan instructions)
- **Keyboard Navigation**: Implemented comprehensive keyboard shortcuts for all operations

### 5. Fixed Appointment Form Location Type Dropdown

We've replaced the standard Select component with the more robust EnhancedSelect component that has proven to work reliably in other parts of the application:

**Key Components:**
- **Component Replacement**: Replaced standard Select with EnhancedSelect component for the location type field
- **Data Format Adaptation**: Converted LocationTypeOptions to the format expected by EnhancedSelect (from `{value, label}` to `{id, name}`)
- **Enhanced Logging**: Added proper logging for debugging dropdown value changes
- **Consistent Styling**: Maintained form description and styling for consistency
- **Value Persistence**: Leveraged EnhancedSelect's built-in value persistence and recovery mechanisms
- **Root Cause Solution**: Implemented a comprehensive solution that addresses the underlying issues rather than symptoms

### 6. Added Province Information to Appointment Form

We've added the province information from the claim as a read-only field in the appointment form:

**Key Components:**
- **ProvinceDisplay Component**: Created a dedicated component to display province information
- **Data Fetching**: Used the lookup.getProvinces API to fetch province data
- **Read-Only Display**: Implemented a disabled input field with appropriate styling
- **Visual Indicator**: Added a map pin icon for better visual recognition
- **Fallback Handling**: Added proper handling for loading states and missing data

## Previous Focus: Inspection Photo Upload System Improvements

We've implemented significant improvements to the inspection photo upload system to ensure photos are stored in the correct Supabase bucket with a consistent path structure. These changes have fixed issues with Row Level Security (RLS) policy violations when uploading photos during vehicle inspections.

### 1. Unified Storage Bucket

We've consolidated all file uploads to use a single Supabase storage bucket:

**Key Components:**
- **Consistent Bucket Usage**: Updated all components to use the `claim-attachments` bucket instead of `vehicle-inspections`
- **Standardized Path Structure**: Implemented a consistent path structure: `claims/{claimId}/inspections/{inspectionId}/{section}/{type}`
- **RLS Policy Updates**: Created and applied SQL migrations to update the RLS policies for the `claim-attachments` bucket
- **Authentication Integration**: Updated the `useSupabaseStorage` hook to use the Zustand auth store for authentication
- **Enhanced StorageImage Component**: Improved the component to better handle different URL formats and provide detailed logging
- **Data Integrity Fix**: Addressed issue where photos exist in storage but inspection records were missing from database

## Previous Focus: Claim Count System Improvements and Job Number Generation

We've implemented significant improvements to the claim count system and job number generation to ensure accurate sidebar badge counts and reliable job number creation. These changes have fixed issues with counts not updating when new claims are created and job numbers having duplicate key violations.

### 1. Improved Claim Count System

We've implemented a hybrid approach to claim counts that combines server-side rendering with client-side updates:

**Key Components:**
- **Fixed getCounts Procedure**: Updated to use the `count` property from Supabase instead of `data?.length`
- **Improved Caching Strategy**: Reduced refetch interval and added better caching options
- **Optimistic Updates**: Implemented optimistic updates for claim creation and status changes
- **Real-time Updates**: Added Supabase real-time subscriptions for instant updates
- **Hybrid Approach**: Created a new `useHybridClaimCounts` hook that combines server-rendered counts with client-side updates

### 2. Robust Job Number Generation

We've implemented a global sequential numbering system for job numbers to avoid duplicate key violations:

**Key Components:**
- **Global Sequence**: Created a PostgreSQL sequence for generating unique numbers across all clients
- **Client Prefix Retention**: Maintained client prefixes for immediate recognition
- **Error Handling**: Added robust error handling and fallback mechanisms
- **Compatibility**: Ensured compatibility with existing job numbers
- **No Data Migration**: Implemented the solution without requiring data migration

## Previous Focus: Server-Side Rendering Fixes and Claim Status Updates

We've fixed critical issues with server-side rendering, claim status enum handling, and error boundaries. These fixes have significantly improved the stability and performance of the application, particularly for the claims list and claim details pages.

### 1. Fixed Server-Side Rendering Issues

We've addressed several critical issues with server-side rendering that were causing errors and performance problems:

**Key Components:**
- **Improved createServerCaller Function**: Enhanced error handling and fallback mechanisms
- **Fixed Claim Status Enum Handling**: Updated code to use IN_PROGRESS instead of INSPECTION_DONE
- **Proper Null Value Handling**: Modified database queries to handle nullable status fields
- **ErrorBoundary Component Fixes**: Created custom ErrorBoundary for client components
- **Timeout Handling**: Implemented graceful timeouts for server-side operations
- **Detailed Error Logging**: Added comprehensive logging for better debugging

### 2. Enhanced Error Resilience

We've significantly improved the application's ability to handle errors gracefully:

**Key Components:**
- **Graceful Fallbacks**: Implemented fallback data for when server-side operations fail
- **Timeout Management**: Added timeout handling to prevent hanging operations
- **Response Validation**: Added validation for server responses to ensure data integrity
- **Suspense Integration**: Properly integrated with React Suspense for loading states
- **Client-Side Recovery**: Enhanced client-side recovery when server-side operations fail

### Previous Focus: Appointment Management System Enhancement

We've implemented a comprehensive appointment management system with the ability to create, edit, cancel, and reschedule appointments. This system includes proper server-side prefetching, client-side fallbacks, and a robust UI for managing the appointment lifecycle.

### 1. Extended Claim Caching Strategy
We've implemented a comprehensive caching strategy to support long claim processing sessions (30+ minutes). This addresses the issue where claims data would be refetched or removed from cache during active sessions.

**Key Components:**
- **Extended Base Cache Times**: Increased stale times and garbage collection times for all claims
- **Active Session Tracking**: Dynamically extends cache times for claims being actively viewed/edited
- **Cache Persistence**: Persists cache to localStorage to survive page refreshes
- **Manual Cache Control**: Functions to manually refresh data with visual indicators for stale data

### 2. Comprehensive Appointment Management System
We've implemented a complete appointment management system with the following features:

1. **Unified Appointment Form**:
   - Single form component for both creating and editing appointments
   - Proper validation and error handling
   - Intuitive date and time selection

2. **Appointment Actions**:
   - Cancel appointments with reason tracking
   - Reschedule appointments to new dates/times
   - Status tracking (pending, confirmed, cancelled, rescheduled, completed)

3. **Server-Side Integration**:
   - Row Level Security (RLS) policies for proper data access control
   - Status-based claim updates (e.g., reverting to "New" when all appointments are cancelled)
   - Proper data validation and error handling

4. **Client-Side Optimizations**:
   - Optimistic updates for immediate UI feedback
   - Proper cache invalidation to ensure data consistency
   - Deduplication of appointment data to prevent duplicate cards

5. **UI Improvements**:
   - Status-based conditional rendering of actions
   - Clear visual indicators of appointment status
   - Intuitive dialogs for confirmation and data entry

### 3. Tab Navigation Loading States
We've enhanced the tab navigation system with comprehensive loading states to provide better user feedback when switching between tabs.

**Key Components:**
- **Loading State Tracking**: Added state to track which tab is currently loading
- **Visual Loading Indicators**: Added spinners and loading text to tab triggers
- **Content Loading Skeletons**: Created skeleton UI components that match the structure of tab content
- **Specialized Skeletons**: Created a specific skeleton for the appointment tab

### 3. Enhanced Server-Side Prefetching
We've significantly improved the server-side prefetching system to make it more reliable and efficient, and fixed the "No procedure found on path" errors.

**Key Components:**
- **Proper Request Context**: Created a mock request object with necessary headers
- **Consistent Caller Creation**: Used the same approach across all server-side prefetching functions
- **Enhanced Error Logging**: Added detailed error logging to help diagnose issues
- **Specific Error Detection**: Added checks for common tRPC errors
- **Client-Side Fallbacks**: Implemented fallback mechanisms when server-side prefetching fails
- **Direct API Calls**: Replaced tRPC hooks with direct API calls to avoid context issues
- **No-Op Prefetching Hooks**: Created safe no-op implementations of prefetching hooks

### 4. Fixed Component Errors and Improved Stability
We've fixed several critical errors in components and improved their stability and error resilience.

**Key Components:**
- **Query Key Generation**: Fixed "TypeError: path is not iterable" by replacing `getQueryKey` with `createEntityQueryKey`
- **Date Formatting**: Fixed "date.toLocaleDateString is not a function" by adding robust date validation and conversion
- **Error Handling**: Added try-catch blocks around prefetch operations to prevent crashes
- **Consistent Query Keys**: Implemented a consistent approach to generating query keys across the application
- **Active Session Tracking**: Fixed remaining "path is not iterable" error in useActiveClaimSession hook
- **Component Stability**: Ensured all components using query keys are using the reliable createEntityQueryKey function
- **ExpandableRow Fixes**: Fixed "usePrefetchClaim is not defined" error in ExpandableRow component
- **Defensive Cell Rendering**: Added defensive checks for cell rendering in data tables
- **No-Op Prefetching**: Replaced direct tRPC hook usage with safer no-op functions

### 5. Appointment Editing System Enhancement
We've implemented a comprehensive appointment editing system with real-time updates and efficient cache management.

**Key Components:**
- **tRPC Update Procedure**: Added update endpoint to the appointment router
- **Data Access Layer**: Created modular DAL with separate types, hooks, mutations, and real-time modules
- **Optimistic Updates**: Implemented immediate UI updates with rollback on error
- **Real-time Updates**: Added Supabase real-time subscriptions for live updates
- **Form Enhancement**: Modified AppointmentForm to handle both creation and editing
- **Location Type Options**: Standardized options (client, tow yard, workshop)
- **Edit UI**: Added edit button and modal dialog for appointment editing

### Key Components Implemented

1. **Extended Cache Times**:
   - Modified `constants.ts` to extend stale times and garbage collection times
   - Added special "active session" times (60 minutes stale, 120 minutes GC)
   - Increased cooldown period between prefetch attempts

2. **Active Session Tracking**:
   - Created `useActiveClaimSession` hook to track active claim sessions
   - Implemented dynamic cache time extension for active claims
   - Added session activity tracking in sessionStorage
   - Created session timeout warning with extension options

3. **Cache Persistence**:
   - Implemented `createPersistedQueryClient` function using TanStack Query plugins
   - Configured persistence to localStorage with 24-hour maximum age
   - Updated query client creation in the application
   - Added error handling for persistence setup failures

4. **Manual Cache Control**:
   - Added `useManualCacheControl` hook with functions to invalidate and refresh claim data
   - Created `StaleDataIndicator` component to show when data might be stale
   - Added refresh buttons for manual data refresh
   - Implemented data age tracking and formatting

5. **Tab Loading States**:
   - Added loading state tracking to `TabContainer.client.tsx`
   - Created skeleton UI components for tab content
   - Added loading indicators to tab triggers
   - Implemented specialized `AppointmentTabSkeleton` component

6. **Enhanced Server-Side Prefetching**:
   - Created `createServerCaller` function with proper request context
   - Updated all server-side prefetching functions to use the new caller
   - Added detailed error logging for tRPC errors
   - Used the existing `createCaller` from `root.ts` with our context
   - Implemented `prefetchClaimsListServer` function to prefetch all data needed for claims list
   - Created client-side fallback mechanisms for when server-side prefetching fails
   - Added `usePrefetchOnHover` hook as a safe no-op replacement for old prefetching hooks
   - Fixed ExpandableRow component to use the new prefetching approach

### Technical Approach

- **Extended Cache Duration**: Prioritizing longer cache durations for claim sessions
- **Active Session Detection**: Tracking user activity to identify active claim sessions
- **Dynamic Cache Configuration**: Adjusting cache settings based on session state
- **Persistent Storage**: Using localStorage for cache persistence across page refreshes
- **Visual Feedback**: Providing clear indicators for loading states and stale data
- **Skeleton UI**: Using skeleton components that match the structure of actual content
- **Manual Control**: Giving users control over data freshness with manual refresh options
- **Proper Server Context**: Creating a complete request context for server-side tRPC calls

### Benefits

1. **Improved User Experience**: Claims data remains available throughout long sessions (30+ minutes)
2. **Reduced Network Requests**: Fewer refetches during active claim processing
3. **Session Continuity**: Cache survives page refreshes and browser restarts
4. **Better Visual Feedback**: Clear loading indicators when switching tabs
5. **User Control**: Manual refresh options for when fresh data is needed
6. **Graceful Degradation**: Skeleton UI provides better loading experience
7. **Session Awareness**: Timeout warnings before session expiry
8. **Reliable Server-Side Prefetching**: Fixed "No procedure found on path" errors

### Implementation Details

1. **Server-Side Rendering Fixes**:
   - Enhanced `CPA\src\lib\api\utils\createServerCaller.ts` with better error handling and fallbacks
   - Updated `CPA\src\server\api\trpc.ts` to handle Supabase client creation errors
   - Improved `CPA\src\utils\supabase\server.server.ts` with better error handling for cookie operations
   - Created custom ErrorBoundary component in `CPA\src\components\ui\error-boundary.tsx`
   - Updated `CPA\src\components\layout\ClaimCountsProvider.server.tsx` with timeout handling
   - Enhanced `CPA\src\lib\api\domains\claims\counts-prefetch.server.ts` with response validation
   - Updated `CPA\src\app\claims\page.tsx` with proper Suspense integration

2. **Claim Status Enum Fixes**:
   - Updated `CPA\src\server\api\routers\claim.ts` to use IN_PROGRESS instead of INSPECTION_DONE
   - Modified database queries to handle nullable status fields using `or()` method with `status.in.()`
   - Updated all status filters in the claims list and getCounts procedures
   - Ensured consistent status handling across the application

3. **Conflicting Exports Fix**:
   - Updated `CPA\src\lib\api\domains\claims\index.ts` to use named imports and exports
   - Explicitly exported the useClaimPrefetching function from the claimCache module
   - Resolved conflicts between hooks.ts and claimCache.ts

4. **Extended Cache Times**:
   - Modified `CPA\src\lib\api\domains\claims\constants.ts` to extend cache times
   - Increased stale time for claim details from 5 to 20 minutes
   - Increased garbage collection time from 15 to 60 minutes
   - Added special "active session" times (60 minutes stale, 120 minutes GC)

5. **Active Session Tracking**:
   - Created `CPA\src\lib\api\domains\claims\useActiveClaimSession.ts` hook
   - Implemented dynamic cache time extension using `queryClient.setQueryDefaults`
   - Added session activity tracking in sessionStorage
   - Created event listeners for user activity (clicks, keystrokes, etc.)

6. **Cache Persistence**:
   - Created `CPA\src\lib\api\queryClient.ts` with persisted query client implementation
   - Updated `CPA\src\trpc\query-client.ts` to use persistence
   - Modified `CPA\src\trpc\react.tsx` to use the persisted client
   - Added error handling for persistence setup failures

7. **Manual Cache Control**:
   - Added functions to `CPA\src\lib\api\domains\claims\claimCache.ts`
   - Created `CPA\src\components\ui\StaleDataIndicator.tsx` component
   - Created `CPA\src\components\ui\SessionTimeoutWarning.tsx` component
   - Created `CPA\src\app\claims\[id]\ClaimSessionManager.client.tsx` component

8. **Tab Loading States**:
   - Updated `CPA\src\app\claims\[id]\TabContainer.client.tsx` with loading state
   - Created `CPA\src\app\claims\[id]\tabs\appointments\components\AppointmentTabSkeleton.tsx`
   - Updated `CPA\src\app\claims\[id]\tabs\appointments\AppointmentsTab.tsx` to use the skeleton
   - Added loading indicators to tab triggers

9. **Fixed Server-Side Prefetching**:
   - Created `createServerCaller` function with proper request context
   - Updated all server-side prefetching functions to use the new caller
   - Added detailed error logging for tRPC errors
   - Used the existing `createCaller` from `root.ts` with our context

10. **Fixed Component Errors and Improved Stability**:
    - Updated `claimCache.ts` to use `createEntityQueryKey` instead of `getQueryKey`
    - Fixed date formatting in `columns.tsx` with robust validation and conversion
    - Added try-catch blocks around prefetch operations in `page.tsx`
    - Updated `posts/hooks.ts` to use consistent query key generation
    - Fixed expandable row rendering with stable keys in `ExpandableRow.tsx`
    - Updated `useActiveClaimSession.ts` to use `createEntityQueryKey` for reliable query key generation
    - Ensured consistent query key approach across all components that interact with the cache
    - Fixed "usePrefetchClaim is not defined" error in ExpandableRow component
    - Replaced direct tRPC hook usage with safer no-op functions from `usePrefetchOnHover`
    - Added defensive cell rendering to handle edge cases in data tables
    - Improved component stability with better error handling and fallbacks

11. **Appointment Editing System**:
    - Added update procedure to `appointment.ts` router with proper validation
    - Created modular DAL structure with separate files:
      - `types.ts` for type definitions and location type options
      - `mutations.ts` for update mutation with cache management
      - `hooks.ts` for useUpdateAppointment hook with optimistic updates
      - `realtime.ts` for Supabase real-time subscriptions
    - Enhanced `AppointmentForm.tsx` to handle both creation and editing modes
    - Created `AppointmentEditButton.tsx` component for opening edit dialog
    - Updated `AppointmentsTabClient.tsx` to include edit functionality
    - Fixed Supabase client integration by using project's own client creation function
    - Implemented proper cleanup of Supabase subscriptions

### Current Status

The server-side rendering fixes, claim status enum handling, error boundary improvements, and enhanced error resilience have been implemented and are ready for testing. These changes, along with the previously implemented appointment management system and server-side prefetching enhancements, provide a robust foundation for the application. The changes include:

- **Server-Side Rendering Fixes**:
  - Fixed `invalid input value for enum claim_status_enum: "undefined"` error in claim router
  - Updated claim router to handle null values properly using `or()` method with `status.in.()`
  - Fixed ErrorBoundary component issues in server components
  - Created custom ErrorBoundary component for client components
  - Fixed conflicting exports for useClaimPrefetching
  - Improved error handling and timeouts in server components
  - Added more detailed logging for better debugging
  - Implemented graceful fallbacks for when errors occur

- **Claim Status Enum Fixes**:
  - Updated code to use IN_PROGRESS instead of INSPECTION_DONE in all queries
  - Fixed status filtering in claims list and getCounts procedures
  - Ensured proper handling of nullable status fields in database queries
  - Updated UI components to reflect the new status values
  - Implemented consistent status handling across the application

- **Enhanced Server-Side Prefetching**:
  - Enhanced server-side prefetching with proper tRPC context
  - Client-side fallback mechanisms for when server-side prefetching fails
  - No-op prefetching hooks as safe replacements for old prefetching hooks
  - Fixed "usePrefetchClaim is not defined" error in ExpandableRow component
  - Replaced direct tRPC hook usage with safer no-op functions
  - Added defensive cell rendering to handle edge cases in data tables
  - Improved component stability with better error handling and fallbacks

- **Extended Caching Strategy**:
  - Extended cache times for claim data (up to 60 minutes for active sessions)
  - Active session tracking with dynamic cache time extension
  - Cache persistence across page refreshes using localStorage
  - Manual cache control with visual indicators for stale data
  - Session timeout warnings with extension options

- **UI Improvements**:
  - Loading state tracking for tab navigation
  - Skeleton UI components for tab content
  - Specialized skeleton for appointment tab
  - Fixed "path is not iterable" errors with improved query key generation
  - Fixed date formatting issues with robust validation and conversion
  - Added error handling for prefetch operations
  - Implemented consistent approach to query key generation
  - Optimized inspection form layout with side-by-side registration and license disc sections
  - Removed redundant components (damage section, vehicle overview, separate 360° tab)
  - Streamlined tab structure by integrating 360° view into the inspection tab

- **Appointment Management System**:
  - Comprehensive appointment management system with create, edit, cancel, and reschedule functionality
  - Appointment status tracking (pending, confirmed, cancelled, rescheduled, completed)
  - Reason tracking for cancelled appointments
  - Status-based claim updates (e.g., reverting to "New" when all appointments are cancelled)
  - Optimistic updates for immediate UI feedback
  - Standardized location type options (client, tow yard, workshop)
  - Modular Data Access Layer for appointments
  - Fixed Supabase client integration for real-time updates
  - Fixed UI issues with appointment forms (date selection, modal opening)
  - Deduplication of appointment data to prevent duplicate cards

### Implementation Details

1. **Global Synchronization Status Indicator**:
   - Created `src/stores/syncStatusStore.ts` with Zustand store for tracking sync status
   - Implemented `src/components/ui/SyncStatusIndicator.tsx` component for visual feedback
   - Updated `EditableEstimateLinesTable.tsx` to use the sync status store
   - Modified `syncLineWithServer`, `handleAddLine`, and `handleDeleteLine` functions to track operations
   - Added the indicator to `EstimateTabContent.tsx` for all views

2. **Estimate Editor Keyboard Navigation**:
   - Added focused cell state tracking in `EditableEstimateLinesTable.tsx`
   - Implemented keyboard event handlers for Tab, arrow keys, and Enter
   - Created navigation helper functions for horizontal and vertical movement
   - Added visual indicators for the focused cell
   - Ensured proper focus management when navigating between cells

3. **Decimal Value Handling**:
   - Enhanced number parsing to support both comma and period as decimal separators
   - Fixed issues with decimal values like "0.5" being incorrectly converted to "0.01"
   - Improved input field behavior with better validation and formatting
   - Added proper handling for raw vs. formatted values
   - Ensured exact numeric values are preserved during editing and server synchronization

### Next Steps

1. **Further Enhance Estimate Editor**:
   - Implement sequence number handling with drag-and-drop reordering
   - Add bulk operations for multiple selected rows
   - Improve part number field with collapsible/expandable functionality
   - Add copy/paste functionality for cells and rows
   - Implement formula support for basic calculations between cells

2. **Fix Remaining Server-Side Rendering Issues**:
   - Fix the recordInspection procedure output validation error
   - Optimize timeout values for production environment
   - Implement a more sophisticated retry mechanism
   - Add more comprehensive error tracking
   - Enhance caching strategy for frequently accessed data

3. **Enhance Appointment Management**:
   - Add email notifications for appointment changes
   - Implement calendar integration for appointment scheduling
   - Add bulk appointment management features
   - Create appointment reports and analytics

4. **Expand Claim Processing Features**:
   - Implement inspection data capture
   - Add estimate creation and approval workflow
   - Integrate with repair shop systems
   - Add document generation for reports and authorizations

5. **Improve User Experience**:
   - Add more interactive elements to the claim details page
   - Implement drag-and-drop for file uploads
   - Create a mobile-optimized view for field adjusters

6. **Performance and Reliability**:
   - Implement more comprehensive error tracking
   - Add automated testing for critical workflows
   - Optimize database queries for large datasets
   - Implement background processing for long-running tasks

For a comprehensive understanding of the application structure and data flow, refer to:
- [index.md](@memory-bank/index.md) - High-level application structure overview
- [flow.md](@memory-bank/flow.md) - Detailed data flow and component interactions
