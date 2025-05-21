import { useState } from "react";
import { toast } from "sonner";
import { QueryClient } from "@tanstack/react-query";
import { FormValues } from "../schema";
import { useCreateClaimWithVehicle, ClaimInstruction, TypeOfLoss } from "@/lib/api/domains/claims";
import { apiClient } from "@/lib/api/client";
import { getQueryKey } from "@/lib/api/utils";

export function useClaimSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newlyCreatedClaimId, setNewlyCreatedClaimId] = useState<string | null>(null);
  const [claimCreationComplete, setClaimCreationComplete] = useState(false);

  // Get the create mutation for combined claim and vehicle creation
  const createClaimWithVehicle = useCreateClaimWithVehicle();

  // Handle form submission - single-step process
  const onSubmit = async (data: FormValues): Promise<boolean> => {
    console.log("useClaimSubmission.onSubmit called with data:", JSON.stringify(data, null, 2));

    // Prevent duplicate submissions
    if (isSubmitting) {
      console.log("Already submitting, ignoring duplicate submission");
      return false;
    }

    setIsSubmitting(true);
    console.log("Form submission started - isSubmitting set to true");

    try {
      // Prepare vehicle data
      const vehicleData = {
        make: data.make,
        model: data.model || undefined,
        year: data.year || undefined,
        color: data.color || undefined,
        registration_number: data.registration_number || undefined,
        vin: data.vin || undefined,
        engine_number: data.engine_number || undefined,
        owner_name: data.owner_name,
        owner_contact: data.owner_contact,
      };

      // Combine date and time of loss
      const date = data.date_of_loss;
      const time = data.time_of_loss; // "HH:MM"
      const parts = time.split(':');
      const hours = parseInt(parts[0] || '0', 10);
      const minutes = parseInt(parts[1] || '0', 10);
      date.setHours(hours, minutes, 0, 0); // Combine date and time into the Date object

      // Prepare claim data
      const claimData = {
        client_id: data.client_id,
        client_reference: data.client_reference || undefined,
        policy_number: data.policy_number || undefined,
        instruction: data.instruction,
        date_of_loss: date, // Pass the combined Date object
        time_of_loss: data.time_of_loss,
        type_of_loss: data.type_of_loss as TypeOfLoss || undefined,
        accident_description: data.accident_description || undefined,
        claims_handler_name: data.claims_handler_name || undefined,
        claims_handler_contact: data.claims_handler_contact || undefined,
        claims_handler_email: data.claims_handler_email || undefined,
        insured_name: data.insured_name || undefined,
        claim_location: data.claim_location || undefined,
        province_id: data.province_id || undefined,
        assigned_employee_id: data.assigned_to_employee_id || undefined,
      };

      // Use client special instructions as notes if available
      let notes = data.client_special_instructions || '';

      // Add owner information to notes if available
      if (data.owner_email || data.owner_alt_phone || data.owner_address) {
        const additionalInfo = [
          data.owner_email ? `Email: ${data.owner_email}` : '',
          data.owner_alt_phone ? `Alt Phone: ${data.owner_alt_phone}` : '',
          data.owner_address ? `Address: ${data.owner_address}` : ''
        ].filter(Boolean).join('\n');

        if (additionalInfo) {
          notes = notes
            ? `${notes}\n\nOwner Additional Info:\n${additionalInfo}`
            : `Owner Additional Info:\n${additionalInfo}`;
        }
      }

      // Add party type information to notes
      if (data.party_type) {
        notes = notes
          ? `${notes}\n\nParty Type: ${data.party_type}`
          : `Party Type: ${data.party_type}`;
      }

      // Add notes to claim data if we have any
      if (notes) {
        claimData.client_special_instructions = notes;
      }

      console.log("Creating claim with vehicle...");
      console.log("Vehicle data:", vehicleData);
      console.log("Claim data:", claimData);

      // Create the claim and vehicle in a single transaction
      const createdClaim = await createClaimWithVehicle.mutateAsync({
        vehicle: vehicleData,
        claim: claimData
      });

      console.log("Claim with vehicle created successfully:", createdClaim);

      console.log("Claim created successfully:", createdClaim);

      // Store the newly created claim ID and update state
      setNewlyCreatedClaimId(createdClaim.id);
      setClaimCreationComplete(true);

      // Scroll to the attachments section
      setTimeout(() => {
        const attachmentsSection = document.getElementById('attachments-section');
        if (attachmentsSection) {
          attachmentsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);

      // Invalidate queries to refresh the UI
      try {
        const queryClient = new QueryClient();
        queryClient.invalidateQueries({ queryKey: ['claim'] });
        queryClient.invalidateQueries({ queryKey: ['trpc', 'claim'] });

        // Set a flag to force refresh on the claims list page
        window.localStorage.setItem('forceClaimsRefresh', Date.now().toString());

        // Dispatch event for any listeners
        window.dispatchEvent(new CustomEvent('claimCreated', {
          detail: { claimId: createdClaim.id }
        }));
      } catch (error) {
        console.error("Error refreshing cache:", error);
        // Continue anyway
      }

      toast.success(`Claim created successfully. You can now upload attachments.`);
      // Don't redirect yet - allow user to upload attachments
      return true;
    } catch (error: any) {
      console.error("Error creating claim/vehicle:", error);

      // Provide more detailed error information
      let errorMessage = 'Failed to create claim/vehicle';

      if (error.message) {
        errorMessage = error.message;
      }

      if (error.cause) {
        console.error("Error cause:", error.cause);
        errorMessage += ` (Cause: ${error.cause.message || 'Unknown'})`;
      }

      // Check if it's a network error
      if (error.name === 'NetworkError' || error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }

      // Check if it's a validation error
      if (error.name === 'ValidationError' || error.message?.includes('validation')) {
        errorMessage = 'Validation error. Please check your form inputs and try again.';
      }

      // Log the error details for debugging
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });

      toast.error(`Error: ${errorMessage}`);
      return false;
    } finally {
      console.log("Setting isSubmitting to false");
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    setIsSubmitting,
    newlyCreatedClaimId,
    claimCreationComplete,
    createClaimWithVehicle,
    onSubmit
  };
}
