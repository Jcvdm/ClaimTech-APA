"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type EstimateCreate,
  EstimateCreateSchema,
  EstimateType,
  EstimateSource
} from "@/lib/api/domains/estimates/types";
import { useCreateEstimate } from "@/lib/api/domains/estimates/hooks";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EstimateFormProps {
  claimId: string;
  onCancel: () => void;
}

export function EstimateForm({ claimId, onCancel }: EstimateFormProps) {
  const createEstimate = useCreateEstimate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EstimateCreate>({
    resolver: zodResolver(EstimateCreateSchema),
    defaultValues: {
      claim_id: claimId,
      estimate_type: EstimateType.INCIDENT,
      estimate_source: EstimateSource.IN_HOUSE,
      vat_rate_percentage: 15,
      panel_labor_rate: 350.00, // Single labor rate for all labor types - updated to 350
      paint_material_rate: 2000.00, // Per panel rate - updated to 2000 (no markup)
      special_markup_percentage: 25, // Special services markup - updated to 25%
      part_markup_percentage: 25, // Markup only on parts - updated to 25%
    },
  });

  const onSubmit = (data: EstimateCreate) => {
    console.log("Submitting estimate data:", data);
    setError(null);

    createEstimate.mutate(data, {
      onSuccess: (result) => {
        console.log("Estimate created successfully:", result);
        toast.success("Estimate created successfully");
        // Explicitly call onCancel to return to the estimate view
        onCancel();
      },
      onError: (error) => {
        console.error("Error creating estimate:", error);
        toast.error(`Failed to create estimate: ${error.message}`);
        setError(`Failed to create estimate: ${error.message}`);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Estimate</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Display error message if there's an error */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* VAT Rate */}
              <FormField
                control={form.control}
                name="vat_rate_percentage"
                render={({ field }) => (
                  <FormItem className="w-32">
                    <FormLabel>VAT Rate (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="text-right"
                        {...field}
                        value={field.value}
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

              {/* Labor Rate */}
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
                        {...field}
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

              {/* Paint Material Rate */}
              <FormField
                control={form.control}
                name="paint_material_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paint Material Rate (per panel, no markup)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        className="text-right"
                        {...field}
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



              {/* Part Markup Percentage */}
              <FormField
                control={form.control}
                name="part_markup_percentage"
                render={({ field }) => (
                  <FormItem className="w-32">
                    <FormLabel>Part Markup (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="text-right"
                        {...field}
                        value={field.value}
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

              {/* Special Markup Percentage */}
              <FormField
                control={form.control}
                name="special_markup_percentage"
                render={({ field }) => (
                  <FormItem className="w-32">
                    <FormLabel>Special Services Markup (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="numeric"
                        className="text-right"
                        {...field}
                        value={field.value}
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
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any notes about this estimate"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={createEstimate.isPending}>
                {createEstimate.isPending ? "Creating..." : "Create Estimate"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
