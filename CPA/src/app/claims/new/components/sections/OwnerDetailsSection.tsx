'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { EnhancedSelect } from "@/components/ui/enhanced-select";
import { Textarea } from "@/components/ui/textarea";

interface OwnerDetailsSectionProps {
  form: any;
  isSubmitting: boolean;
}

export function OwnerDetailsSection({ form, isSubmitting }: OwnerDetailsSectionProps) {
  // Count completed fields
  const requiredFields = ["owner_name", "owner_contact"];
  const completedFields = requiredFields.filter(field => {
    const value = form.getValues(field);
    return value !== undefined && value !== null && value !== "";
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Owner Details</CardTitle>
          <Badge variant={completedFields.length === requiredFields.length ? "success" : "outline"}>
            {completedFields.length} of {requiredFields.length} required fields
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Party Type - Using Enhanced Select */}
          <FormField
            control={form.control}
            name="party_type"
            render={({ field }) => (
              <EnhancedSelect
                name="party_type"
                label="Party Type"
                control={form.control}
                options={[
                  { id: "Insured", name: "Insured" },
                  { id: "Third Party", name: "Third Party" }
                ]}
                disabled={isSubmitting}
                onValueChange={(value) => {
                  console.log("[OwnerDetailsSection] Party type selected:", value);
                }}
              />
            )}
          />

          {/* Insured Name */}
          <FormField
            control={form.control}
            name="insured_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Insured Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Name of the insured party"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Owner Name */}
          <FormField
            control={form.control}
            name="owner_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isSubmitting}
                    placeholder="Vehicle owner's name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Owner Contact */}
          <FormField
            control={form.control}
            name="owner_contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Contact <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled={isSubmitting}
                    placeholder="Owner's phone number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Owner Email */}
          <FormField
            control={form.control}
            name="owner_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    type="email"
                    disabled={isSubmitting}
                    placeholder="Owner's email address"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Owner Alt Phone */}
          <FormField
            control={form.control}
            name="owner_alt_phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alternative Phone</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Alternative phone number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Owner Address */}
        <FormField
          control={form.control}
          name="owner_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Address</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  disabled={isSubmitting}
                  placeholder="Owner's physical address"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Special Instructions */}
        <FormField
          control={form.control}
          name="client_special_instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Instructions</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  disabled={isSubmitting}
                  placeholder="Any special instructions or notes"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
