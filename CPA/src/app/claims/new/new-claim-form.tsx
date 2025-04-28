"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Form } from "@/components/ui/form"; // Import Form component
import { useTabNavigation } from "./hooks/useTabNavigation";
import { TabNavigation } from "./components/TabNavigation";
import { ClaimInfoTab } from "./components/ClaimInfoTab";
import { OwnerDetailsTab } from "./components/OwnerDetailsTab";
import { VehicleDetailsTab } from "./components/VehicleDetailsTab";
import { LocationDetailsTab } from "./components/LocationDetailsTab";
import { AdjusterDetailsTab } from "./components/AdjusterDetailsTab";
import { AttachmentsTab } from "./components/AttachmentsTab";
import { formSchema, defaultFormValues, type FormValues } from "./schema"; // Use type-only import for FormValues
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { ApiStatus } from "@/lib/api/types"; // Import ApiStatus enum
import { type TabName } from "./hooks/useTabNavigation"; // Import TabName type

export function NewClaimForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimCreationComplete, setClaimCreationComplete] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues,
  });

  // Initialize tab navigation
  const { activeTab, setActiveTab, goToNextTab, goToPreviousTab } = useTabNavigation(form);

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

  // Handle form submission
  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    
    try {
      console.log("Form values:", values);
      // Here you would typically call your API to create the claim
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set claim creation as complete
      setClaimCreationComplete(true);
      
      // Navigate to the attachments tab
      setActiveTab("attachments");
    } catch (error) {
      console.error("Error creating claim:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

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

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabName)}> {/* Fix type mismatch */}
          <TabNavigation
            activeTab={activeTab}
            claimCreationComplete={claimCreationComplete}
          />
          
          <Form {...form}> {/* Wrap with Form provider */}
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <TabsContent value="claim-info">
                <ClaimInfoTab
                  form={form}
                  isSubmitting={isSubmitting}
                  goToNextTab={goToNextTab}
                />
              </TabsContent>
              
              <TabsContent value="owner-details">
                <OwnerDetailsTab
                  form={form}
                  isSubmitting={isSubmitting}
                  goToNextTab={goToNextTab}
                  goToPreviousTab={goToPreviousTab}
                />
              </TabsContent>
              
              <TabsContent value="vehicle-details">
                <VehicleDetailsTab
                  form={form}
                  isSubmitting={isSubmitting}
                  goToNextTab={goToNextTab}
                  goToPreviousTab={goToPreviousTab}
                />
              </TabsContent>
              
              <TabsContent value="location-details">
                <LocationDetailsTab
                  form={form}
                  isSubmitting={isSubmitting}
                  goToNextTab={goToNextTab}
                  goToPreviousTab={goToPreviousTab}
                />
              </TabsContent>
              
              <TabsContent value="adjuster-details">
                <AdjusterDetailsTab
                  form={form}
                  isSubmitting={isSubmitting}
                  // goToNextTab={goToNextTab} // Remove unnecessary prop
                  goToPreviousTab={goToPreviousTab}
                />
              </TabsContent>
              
              <TabsContent value="attachments">
                <AttachmentsTab
                  isSubmitting={isSubmitting}
                  claimCreationComplete={claimCreationComplete}
                  uploadedFiles={uploadedFiles}
                  uploadProgress={uploadProgress}
                  getRootProps={getRootProps}
                  getInputProps={getInputProps}
                  isDragActive={isDragActive}
                  removeFile={removeFile}
                  uploadFiles={uploadFiles}
                />
              </TabsContent>
            </form>
          </Form> {/* Close Form wrapper */}
        </Tabs>
      </CardContent>
    </Card>
  );
}
