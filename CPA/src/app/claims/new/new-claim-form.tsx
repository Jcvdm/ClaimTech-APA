"use client";

/**
 * New Claim Form
 *
 * This form allows users to create a new claim with a stacked card layout.
 *
 * Note: The following fields have been removed from the initial claim creation form
 * and will be captured during the vehicle inspection process instead:
 * - transmission_type
 * - drive_type
 * - fuel_type
 * - license_disk_expiry
 * - license_disk_present
 * - has_lettering
 * - has_trim_mouldings
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { formSchema, defaultFormValues, type FormValues } from "./schema";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { useClaimSubmission } from "./hooks/useClaimSubmission";
import { useClaimFormPersistence } from "@/hooks/useClaimFormPersistence";
import { StatusBadge } from "@/components/inspection/StatusBadge";
import { ValidationSummary } from "./components/ValidationSummary";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import section components
import { ClaimInfoSection } from "./components/sections/ClaimInfoSection";
import { OwnerDetailsSection } from "./components/sections/OwnerDetailsSection";
import { VehicleDetailsSection } from "./components/sections/VehicleDetailsSection";
import { LocationDetailsSection } from "./components/sections/LocationDetailsSection";
import { AdjusterDetailsSection } from "./components/sections/AdjusterDetailsSection";
import { AttachmentsSection } from "./components/sections/AttachmentsSection";
import { SubmitSection } from "./components/sections/SubmitSection";

export function NewClaimForm() {
  const router = useRouter();

  // Use the claim submission hook
  const {
    isSubmitting,
    setIsSubmitting,
    newlyCreatedClaimId,
    claimCreationComplete,
    onSubmit
  } = useClaimSubmission();

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  // Try to get persisted values from localStorage
  const getPersistedValues = () => {
    if (typeof window === 'undefined') return defaultFormValues;

    try {
      const persistedDataString = localStorage.getItem(`claim-form-state-new-claim`);
      if (!persistedDataString) return defaultFormValues;

      const persistedData = JSON.parse(persistedDataString);
      if (persistedData.version && persistedData.data) {
        console.log("[NewClaimForm] Found persisted data:", persistedData.data);
        return { ...defaultFormValues, ...persistedData.data };
      }
    } catch (e) {
      console.error("[NewClaimForm] Error loading persisted values:", e);
    }

    return defaultFormValues;
  };

  // Initialize the form with persisted values and delayed validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getPersistedValues(),
    mode: "onTouched", // Only validate fields after they've been touched
    reValidateMode: "onChange", // Re-validate when values change after being touched
  });

  // Initialize form persistence
  const { status: formStatus, hasUnsavedChanges, clearPersistedData, selectFieldValues } = useClaimFormPersistence(
    'new-claim',
    defaultFormValues,
    form
  );

  // Add form state synchronization
  useEffect(() => {
    // List of critical fields to monitor
    const criticalFields = ['client_id', 'province_id', 'assigned_to_employee_id', 'instruction', 'type_of_loss'];

    // Create a synchronization function
    const syncFormState = () => {
      const currentValues = form.getValues();

      // Check localStorage for any values that might be missing in the form
      criticalFields.forEach(field => {
        try {
          const persistedDataString = localStorage.getItem(`claim-form-state-new-claim`);
          if (!persistedDataString) return;

          let persistedData;
          let data;
          let backupSelectFields = {};

          try {
            persistedData = JSON.parse(persistedDataString);
            // Handle both new and legacy format
            if (persistedData.version) {
              data = persistedData.data;
              backupSelectFields = persistedData.selectFields || {};
            } else {
              data = persistedData;
            }
          } catch (e) {
            console.error('Failed to parse persisted data:', e);
            return;
          }

          // If we have a persisted value but the form value is empty, restore it
          if ((data[field] || backupSelectFields[field]) && !currentValues[field]) {
            const valueToRestore = data[field] || backupSelectFields[field];
            console.log(`[FormSync] Restoring ${field} from localStorage:`, valueToRestore);
            form.setValue(field, valueToRestore, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true
            });
          }

          // Also check our backup storage
          const backupValue = localStorage.getItem(`select-backup-${field}`);
          if (backupValue && !currentValues[field]) {
            console.log(`[FormSync] Restoring ${field} from backup:`, backupValue);
            form.setValue(field, backupValue, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true
            });
          }
        } catch (error) {
          console.error(`[FormSync] Error syncing ${field}:`, error);
        }
      });
    };

    // Run synchronization on mount and periodically
    syncFormState();
    const interval = setInterval(syncFormState, 5000);

    // Also run synchronization when the form becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFormState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [form, selectFieldValues]);

  // Initialize dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setUploadedFiles([...uploadedFiles, ...acceptedFiles]);
      // Initialize progress for each file
      const newProgress = { ...uploadProgress };
      acceptedFiles.forEach(file => {
        newProgress[file.name] = 0;
      });
      setUploadProgress(newProgress);
    },
    disabled: isSubmitting || !claimCreationComplete,
  });

  // Handle file removal
  const removeFile = (fileName: string) => {
    setUploadedFiles(uploadedFiles.filter(file => file.name !== fileName));
    const newProgress = { ...uploadProgress };
    delete newProgress[fileName];
    setUploadProgress(newProgress);
  };

  // Handle file upload
  const uploadFiles = async () => {
    if (uploadedFiles.length === 0) {
      router.push("/claims");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate file upload with progress
      for (const file of uploadedFiles) {
        for (let progress = 0; progress <= 100; progress += 10) {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Navigate back to claims list after successful upload
      router.push("/claims");
    } catch (error) {
      console.error("Error uploading files:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form submission
  const handleSubmit = () => {
    // Find and click the hidden submit button to trigger the form's submit handler
    const submitButton = document.getElementById('hidden-submit-button');
    if (submitButton) {
      console.log("Found hidden submit button, clicking it");
      submitButton.click();
    } else {
      console.log("Hidden submit button not found, using form.handleSubmit");

      // If we can't find the hidden submit button, use the form's handleSubmit
      form.handleSubmit((data) => {
        console.log("Form submitted with data:", data);
        onSubmit(data).then((success) => {
          if (success && clearPersistedData) {
            clearPersistedData();
          }
        });
      })();
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create New Claim</h2>
          <StatusBadge status={formStatus} />
        </div>

        <Form {...form}>
          <form
            id="new-claim-form"
            onSubmit={form.handleSubmit((data) => {
              console.log("Form submitted with data:", data);
              onSubmit(data).then((success) => {
                if (success && clearPersistedData) {
                  clearPersistedData();
                }
              });
            })}
          >
            {/* Display validation errors summary */}
            <ValidationSummary form={form} />

            {/* Display draft saved message */}
            {formStatus === 'saved' && (
              <Alert className="mb-6">
                <AlertDescription>
                  Your form progress is automatically saved as a draft. You can continue later if needed.
                </AlertDescription>
              </Alert>
            )}

            {/* Hidden submit button that can be triggered programmatically */}
            <Button
              type="submit"
              style={{ display: 'none' }}
              aria-hidden="true"
              id="hidden-submit-button"
            >
              Submit
            </Button>

            {/* Debug display - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-muted rounded-md">
                <h3 className="text-sm font-medium mb-2">Debug Info (Select Fields)</h3>
                <div className="text-xs space-y-1">
                  <div>client_id: {form.getValues('client_id') || 'none'}</div>
                  <div>instruction: {form.getValues('instruction') || 'none'}</div>
                  <div>type_of_loss: {form.getValues('type_of_loss') || 'none'}</div>
                  <div>party_type: {form.getValues('party_type') || 'none'}</div>
                  <div>province_id: {form.getValues('province_id') || 'none'}</div>
                  <div>assigned_to_employee_id: {form.getValues('assigned_to_employee_id') || 'none'}</div>
                </div>
              </div>
            )}

            {/* Stacked sections */}
            <div className="space-y-8">
              <ClaimInfoSection form={form} isSubmitting={isSubmitting} />
              <OwnerDetailsSection form={form} isSubmitting={isSubmitting} />
              <VehicleDetailsSection form={form} isSubmitting={isSubmitting} />
              <LocationDetailsSection form={form} isSubmitting={isSubmitting} />
              <AdjusterDetailsSection form={form} isSubmitting={isSubmitting} />
              <SubmitSection
                isSubmitting={isSubmitting}
                claimCreationComplete={claimCreationComplete}
                onSubmit={handleSubmit}
              />
              <AttachmentsSection
                isSubmitting={isSubmitting}
                claimCreationComplete={claimCreationComplete}
                uploadedFiles={uploadedFiles}
                uploadProgress={uploadProgress}
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                removeFile={removeFile}
                uploadFiles={uploadFiles}
                claimId={newlyCreatedClaimId || undefined}
              />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
