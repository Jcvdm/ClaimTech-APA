'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { ClaimInstruction } from "@/lib/api/domains/claims";
import { useClients } from "@/lib/api/domains/clients";
import { Loader2 } from "lucide-react";
import { EnhancedSelect } from "@/components/ui/enhanced-select";

interface ClaimInfoSectionProps {
  form: any;
  isSubmitting: boolean;
}

export function ClaimInfoSection({ form, isSubmitting }: ClaimInfoSectionProps) {
  // Fetch clients for the dropdown
  const { data: clients, isLoading: isLoadingClients } = useClients();

  // Count completed fields
  const requiredFields = ["client_id", "instruction", "date_of_loss", "time_of_loss"];
  const completedFields = requiredFields.filter(field => {
    const value = form.getValues(field);
    return value !== undefined && value !== null && value !== "";
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Claim Information</CardTitle>
          <Badge variant={completedFields.length === requiredFields.length ? "success" : "outline"}>
            {completedFields.length} of {requiredFields.length} required fields
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Selection - Using Enhanced Select */}
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <EnhancedSelect
                name="client_id"
                label="Client"
                control={form.control}
                options={clients?.map((client: { id: string, name: string }) => ({
                  id: client.id,
                  name: client.name
                })) || []}
                isLoading={isLoadingClients}
                isError={!clients || clients.length === 0}
                isRequired={true}
                disabled={isSubmitting}
                onValueChange={(value) => {
                  console.log("[ClaimInfoSection] Client selected:", value);
                  // Any additional logic needed when client changes
                }}
              />
            )}
          />

          {/* Client Reference */}
          <FormField
            control={form.control}
            name="client_reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Reference</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Client's reference number"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Policy Number */}
          <FormField
            control={form.control}
            name="policy_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Policy Number</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    disabled={isSubmitting}
                    placeholder="Policy number if applicable"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Instruction Type - Using Enhanced Select */}
          <FormField
            control={form.control}
            name="instruction"
            render={({ field }) => (
              <EnhancedSelect
                name="instruction"
                label="Instruction Type"
                control={form.control}
                options={[
                  { id: ClaimInstruction.AGREE_ONLY, name: "Agree Only" },
                  { id: ClaimInstruction.AGREE_AND_AUTHORIZE, name: "Agree and Authorize" }
                ]}
                isRequired={true}
                disabled={isSubmitting}
                onValueChange={(value) => {
                  console.log("[ClaimInfoSection] Instruction selected:", value);
                }}
              />
            )}
          />

          {/* Date of Loss */}
          <FormField
            control={form.control}
            name="date_of_loss"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Loss <span className="text-destructive">*</span></FormLabel>
                <DatePicker
                  disabled={isSubmitting}
                  date={field.value}
                  onSelect={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Time of Loss */}
          <FormField
            control={form.control}
            name="time_of_loss"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time of Loss <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="time"
                    disabled={isSubmitting}
                    placeholder="HH:MM"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Type of Loss - Using Enhanced Select */}
          <FormField
            control={form.control}
            name="type_of_loss"
            render={({ field }) => (
              <EnhancedSelect
                name="type_of_loss"
                label="Type of Loss"
                control={form.control}
                options={[
                  { id: "Accident", name: "Accident" },
                  { id: "Theft", name: "Theft" },
                  { id: "Fire", name: "Fire" },
                  { id: "Flood", name: "Flood" },
                  { id: "Hail", name: "Hail" },
                  { id: "Vandalism", name: "Vandalism" },
                  { id: "Other", name: "Other" }
                ]}
                disabled={isSubmitting}
                onValueChange={(value) => {
                  console.log("[ClaimInfoSection] Type of loss selected:", value);
                }}
              />
            )}
          />
        </div>

        {/* Accident Description */}
        <FormField
          control={form.control}
          name="accident_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Accident Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ""}
                  disabled={isSubmitting}
                  placeholder="Describe the accident or incident"
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Note about auto-generated job numbers */}
        <div>
          <p className="text-sm text-muted-foreground">
            Note: Job numbers are automatically generated based on client code and a sequential counter.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
