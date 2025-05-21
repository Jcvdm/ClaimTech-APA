# Inspection Integration

## Overview
The vehicle inspection system is a critical component of the claims processing workflow. It allows assessors to document vehicle condition, capture photos, and record inspection details. The inspection process is integrated directly into the claim details page as a tab, providing a seamless user experience.

## Implementation Details

### Architecture
- The inspection tab is implemented as a server component with client-side interactivity
- All data is prefetched server-side when a claim is opened
- The inspection form is rendered directly in the tab rather than requiring navigation to a separate page
- The implementation follows the Data Access Layer (DAL) pattern with proper caching
- The UI uses a vertical, scrollable layout with sections stacked instead of tabs
- Scroll-based prefetching is implemented using the native IntersectionObserver API
- Each section is wrapped in an ErrorBoundary for proper error handling

### Key Components
1. **InspectionTab.tsx** - Server component that renders the inspection tab with proper Suspense boundaries
2. **InspectionTabContent.tsx** - Client component that handles the interactive elements of the inspection tab
3. **Section Components** - Modular components for each section of the inspection form:
   - **InspectionHeader.tsx** - Shows inspection status and provides a button to record a new inspection
   - **VehicleOverviewSection.tsx** - Displays basic vehicle information
   - **RegistrationSection.tsx** - Captures registration number and photo
   - **LicenseDiscSection.tsx** - Records license disc presence, expiry date, and photo
   - **VinSection.tsx** - Captures VIN number and photos of VIN from different locations
   - **ThreeSixtyViewSection.tsx** - Allows uploading photos from 8 different angles around the vehicle
   - **DamageSection.tsx** - Captures damage description and photos
   - **NotesSection.tsx** - Allows adding general notes about the inspection
4. **PhotoUploadCard.tsx** - Reusable component for drag-and-drop photo uploads
5. **server-prefetch.server.ts** - Server-side prefetching logic for inspection data

### Data Flow
1. When a claim is opened, all related data (including inspections) is prefetched server-side
2. The inspection tab displays a status card showing whether an inspection has been recorded
3. Users can record an inspection with a single click, which captures the current date/time
4. After recording an inspection, the form automatically appears for additional details
5. The form can be toggled open/closed using the "View/Edit Details" button

### Error Handling
- All components are wrapped in ErrorBoundary components to provide graceful fallbacks
- Suspense boundaries are used for progressive loading
- Proper loading states are implemented for all async operations

## Usage Guidelines

### Recording an Inspection
1. Navigate to a claim's details page
2. Click on the "Inspection" tab
3. If no inspection has been recorded, click the "Record Inspection" button
4. The form sections are automatically visible in a vertical layout
5. Fill out the form sections as you scroll down
6. Click the "Save Inspection" button at the bottom to save all changes

### Viewing/Editing an Inspection
1. Navigate to a claim's details page
2. Click on the "Inspection" tab
3. If an inspection has been recorded, all details are automatically visible
4. Scroll down to view all sections
5. Make changes to any section as needed
6. Click the "Save Inspection" button at the bottom to save all changes

### Scroll-Based Prefetching
1. As the user scrolls down the page, sections that come into view are detected using IntersectionObserver
2. This allows for efficient loading of resources only when they're needed
3. Each section is wrapped in an ErrorBoundary to prevent the entire form from crashing if one section fails

## Technical Notes
- The inspection form uses the same ErrorBoundary component as the rest of the application
- All inspection data is cached for the duration of the user session
- The implementation follows the server-side prefetching pattern used throughout the application
- The inspection tab is fully integrated with the claim details page, providing a consistent user experience
