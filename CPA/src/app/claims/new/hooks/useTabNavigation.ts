import { useState } from "react";
import { type UseFormReturn } from "react-hook-form"; // Use type-only import
import { type FormValues, tabValidationFields } from "../schema"; // Use type-only import for FormValues

export type TabName = "claim-info" | "owner-details" | "vehicle-details" | "location-details" | "adjuster-details" | "attachments"; // Export type

export function useTabNavigation(form: UseFormReturn<FormValues>) {
  const [activeTab, setActiveTab] = useState<TabName>("claim-info");

  // Function to navigate to the next tab
  const goToNextTab = () => {
    // Validate the current tab's fields before proceeding
    let isValid = true;

    // Get the fields to validate for the current tab
    const fieldsToValidate = tabValidationFields[activeTab as keyof typeof tabValidationFields] || [];

    // Validate the fields
    fieldsToValidate.forEach(fieldName => {
      const fieldState = form.getFieldState(fieldName as any);
      if (fieldState.invalid) {
        isValid = false;
        // Trigger validation to show error messages
        form.trigger(fieldName as any);
      }
    });

    // Only proceed if the current tab is valid
    if (!isValid) {
      return;
    }

    // Navigate to the next tab
    switch (activeTab) {
      case "claim-info":
        setActiveTab("owner-details");
        break;
      case "owner-details":
        setActiveTab("vehicle-details");
        break;
      case "vehicle-details":
        setActiveTab("location-details");
        break;
      case "location-details":
        setActiveTab("adjuster-details");
        break;
      case "adjuster-details":
        // Submit the form when clicking Next on the last tab
        form.handleSubmit(form.handleSubmit as any)();
        break;
      default:
        break;
    }
  };

  // Function to navigate to the previous tab
  const goToPreviousTab = () => {
    switch (activeTab) {
      case "owner-details":
        setActiveTab("claim-info");
        break;
      case "vehicle-details":
        setActiveTab("owner-details");
        break;
      case "location-details":
        setActiveTab("vehicle-details");
        break;
      case "adjuster-details":
        setActiveTab("location-details");
        break;
      case "attachments":
        // Don't allow going back from attachments after claim creation
        break;
      default:
        break;
    }
  };

  return {
    activeTab,
    setActiveTab,
    goToNextTab,
    goToPreviousTab
  };
}
