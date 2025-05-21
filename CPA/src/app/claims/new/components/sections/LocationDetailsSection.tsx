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

interface LocationDetailsSectionProps {
  form: any;
  isSubmitting: boolean;
}

export function LocationDetailsSection({ form, isSubmitting }: LocationDetailsSectionProps) {
  // Use the direct tRPC hook instead of the custom hook
  const {
    data: provinces = [],
    isLoading: isLoadingProvinces,
    isError: isErrorProvinces,
    error,
    refetch
  } = api.lookup.getProvinces.useQuery(undefined, {
    staleTime: Infinity,
    retry: 3,
    retryDelay: 1000,
    refetchOnMount: true,
    onSuccess: (data) => {
      console.log('[LocationDetailsSection] Successfully fetched provinces:', data);
    },
    onError: (err) => {
      console.error('[LocationDetailsSection] Error fetching provinces:', err);
    }
  });

  // Add debugging
  console.log('[LocationDetailsSection] Provinces data:', provinces);
  console.log('[LocationDetailsSection] Loading:', isLoadingProvinces);
  console.log('[LocationDetailsSection] Error:', isErrorProvinces, error);

  // Use effect to refetch if no data
  React.useEffect(() => {
    if (!isLoadingProvinces && (!provinces || provinces.length === 0)) {
      console.log('[LocationDetailsSection] No provinces data, refetching...');
      refetch();
    }
  }, [provinces, isLoadingProvinces, refetch]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Location Details</CardTitle>
          <Badge variant="outline">Optional</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Claim Location */}
          <FormField
            control={form.control}
            name="claim_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Claim Location</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Address where the incident occurred"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Province - Using Enhanced Select */}
          <FormField
            control={form.control}
            name="province_id"
            render={({ field }) => (
              <EnhancedSelect
                name="province_id"
                label="Province"
                control={form.control}
                options={provinces?.map((province: { id: string, name: string }) => ({
                  id: province.id,
                  name: province.name
                })) || []}
                isLoading={isLoadingProvinces}
                isError={!provinces || provinces.length === 0}
                disabled={isSubmitting}
                onValueChange={(value) => {
                  console.log("[LocationDetailsSection] Province selected:", value);
                }}
              />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
