import { useState } from "react";
import { type UseFormReturn } from "react-hook-form"; // Use type-only import
import { type FormValues, tabValidationFields } from "../schema"; // Use type-only import for FormValues

export type TabName = "claim-info" | "owner-details" | "vehicle-details" | "location-details" | "adjuster-details" | "attachments"; // Export type

export function useTabNavigation(
  form: UseFormReturn<FormValues>,
  externalActiveTab?: string,
  externalSetActiveTab?: (tab: string) => void
) {
  // Use external state if provided, otherwise use internal state
  const [internalActiveTab, internalSetActiveTab] = useState<TabName>("claim-info");

  // Use external state if provided, otherwise use internal state
  const activeTab = externalActiveTab || internalActiveTab;
  const setActiveTab = externalSetActiveTab || internalSetActiveTab as (tab: string) => void;

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
        console.log("Submitting form from useTabNavigation");

        // Find and click the hidden submit button to trigger the form's submit handler
        const submitButton = document.getElementById('hidden-submit-button');
        if (submitButton && submitButton instanceof HTMLButtonElement) {
          console.log("Found hidden submit button, clicking it");
          submitButton.click();
        } else {
          console.log("Hidden submit button not found, using form.handleSubmit");

          // If we can't find the hidden submit button, use the form's handleSubmit
          form.handleSubmit((data) => {
            console.log("Form submitted from useTabNavigation with data:", data);
          })();
        }
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
