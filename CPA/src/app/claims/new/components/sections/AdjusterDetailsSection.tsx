'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { EnhancedSelect } from "@/components/ui/enhanced-select";
// Import the direct tRPC API instead of the custom hook
import { api } from "@/trpc/react";
import { Loader2 } from "lucide-react";

interface AdjusterDetailsSectionProps {
  form: any;
  isSubmitting: boolean;
}

export function AdjusterDetailsSection({ form, isSubmitting }: AdjusterDetailsSectionProps) {
  // Use the direct tRPC hook instead of the custom hook
  const {
    data: adjusters = [],
    isLoading: isLoadingAdjusters,
    isError: isErrorAdjusters,
    error,
    refetch
  } = api.lookup.getLossAdjusters.useQuery(undefined, {
    staleTime: 1000 * 60 * 5, // 5 min
    retry: 3,
    retryDelay: 1000,
    refetchOnMount: true,
    onSuccess: (data) => {
      console.log('[AdjusterDetailsSection] Successfully fetched adjusters:', data);
    },
    onError: (err) => {
      console.error('[AdjusterDetailsSection] Error fetching adjusters:', err);
    }
  });

  // Add debugging
  console.log('[AdjusterDetailsSection] Adjusters data:', adjusters);
  console.log('[AdjusterDetailsSection] Loading:', isLoadingAdjusters);
  console.log('[AdjusterDetailsSection] Error:', isErrorAdjusters, error);

  // Use effect to refetch if no data
  React.useEffect(() => {
    if (!isLoadingAdjusters && (!adjusters || adjusters.length === 0)) {
      console.log('[AdjusterDetailsSection] No adjusters data, refetching...');
      refetch();
    }
  }, [adjusters, isLoadingAdjusters, refetch]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Claims Handler & Adjuster Details</CardTitle>
          <Badge variant="outline">Optional</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Claims Handler Name */}
          <FormField
            control={form.control}
            name="claims_handler_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Claims Handler Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Name of the claims handler"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Claims Handler Contact */}
          <FormField
            control={form.control}
            name="claims_handler_contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Claims Handler Contact</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Phone number of the claims handler"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Claims Handler Email */}
          <FormField
            control={form.control}
            name="claims_handler_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Claims Handler Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    type="email"
                    disabled={isSubmitting}
                    placeholder="Email of the claims handler"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Assigned Adjuster - Using Enhanced Select */}
          <FormField
            control={form.control}
            name="assigned_to_employee_id"
            render={({ field }) => (
              <EnhancedSelect
                name="assigned_to_employee_id"
                label="Assigned Adjuster"
                control={form.control}
                options={adjusters?.map((adjuster: { id: string, name: string }) => ({
                  id: adjuster.id,
                  name: adjuster.name
                })) || []}
                isLoading={isLoadingAdjusters}
                isError={!adjusters || adjusters.length === 0}
                disabled={isSubmitting}
                onValueChange={(value) => {
                  console.log("[AdjusterDetailsSection] Adjuster selected:", value);
                }}
              />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
