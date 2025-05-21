'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface VehicleDetailsSectionProps {
  form: any;
  isSubmitting: boolean;
}

export function VehicleDetailsSection({ form, isSubmitting }: VehicleDetailsSectionProps) {
  // Count completed fields
  const requiredFields = ["make"];
  const identifierFields = ["registration_number", "vin", "engine_number"];
  const hasIdentifier = identifierFields.some(field => {
    const value = form.getValues(field);
    return value !== undefined && value !== null && value !== "";
  });
  
  const completedFields = [
    ...requiredFields.filter(field => {
      const value = form.getValues(field);
      return value !== undefined && value !== null && value !== "";
    }),
    ...(hasIdentifier ? [1] : []) // Add 1 to completed count if at least one identifier is provided
  ];
  
  const totalRequired = requiredFields.length + 1; // +1 for at least one identifier

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Vehicle Details</CardTitle>
          <Badge variant={completedFields.length === totalRequired ? "success" : "outline"}>
            {completedFields.length} of {totalRequired} required fields
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Make */}
          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isSubmitting}
                    placeholder="Vehicle make (e.g., Toyota)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Model */}
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Vehicle model (e.g., Corolla)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Year */}
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Vehicle year (e.g., 2020)"
                    min={1900}
                    max={new Date().getFullYear()}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : parseInt(e.target.value, 10);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Color */}
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Vehicle color"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Registration Number */}
          <FormField
            control={form.control}
            name="registration_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Number <span className="text-muted-foreground text-xs">(At least one identifier required)</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Vehicle registration number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* VIN */}
          <FormField
            control={form.control}
            name="vin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VIN <span className="text-muted-foreground text-xs">(At least one identifier required)</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Vehicle Identification Number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Engine Number */}
          <FormField
            control={form.control}
            name="engine_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Engine Number <span className="text-muted-foreground text-xs">(At least one identifier required)</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Engine number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p>Note: Additional vehicle details like transmission type, drive type, fuel type, etc. will be captured during the vehicle inspection process.</p>
        </div>
      </CardContent>
    </Card>
  );
}
