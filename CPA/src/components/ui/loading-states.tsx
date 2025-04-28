"use client";

import { Skeleton } from "@/components/ui/skeleton";

// Simple spinner for general loading
export function LoadingSpinner() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Table/list loading skeleton
export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      
      <div className="rounded-md border">
        <div className="h-12 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-[150px]" />
            <Skeleton className="h-5 w-[100px]" />
          </div>
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border-b last:border-0">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-5 w-[200px]" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[100px]" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

// Detail page loading skeleton
export function DetailLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Skeleton className="h-6 w-[150px]" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-[80%]" />
            <Skeleton className="h-5 w-[60%]" />
          </div>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-6 w-[150px]" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-[70%]" />
            <Skeleton className="h-5 w-[90%]" />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  );
}

// Form loading skeleton
export function FormLoadingSkeleton({ sections = 2, fieldsPerSection = 4 }: { sections?: number, fieldsPerSection?: number }) {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-5 w-[350px] mt-2" />
      </div>
      
      {Array.from({ length: sections }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-6">
          <Skeleton className="h-6 w-[200px]" />
          
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: fieldsPerSection }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-[80%]" />
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <div className="flex justify-end space-x-4">
        <Skeleton className="h-10 w-[100px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
    </div>
  );
}

// Tabbed form loading skeleton (for forms with tabs like the New Claim form)
export function TabbedFormLoadingSkeleton({ sections = 2, fieldsPerSection = 4 }: { sections?: number, fieldsPerSection?: number }) {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-5 w-[350px] mt-2" />
      </div>
      
      <div className="space-y-6">
        <div className="border-b">
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-[150px]" />
            <Skeleton className="h-10 w-[150px]" />
          </div>
        </div>
        
        {Array.from({ length: sections }).map((_, sectionIndex) => (
          <div key={sectionIndex} className="space-y-6">
            <Skeleton className="h-6 w-[200px]" />
            
            <div className="grid gap-6 md:grid-cols-2">
              {Array.from({ length: fieldsPerSection }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-[120px]" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="flex justify-end space-x-4">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[120px]" />
        </div>
      </div>
    </div>
  );
}
