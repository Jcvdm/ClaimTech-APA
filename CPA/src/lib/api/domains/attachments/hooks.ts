import { useQueryClient } from "@tanstack/react-query";
import { attachmentMutations } from "./mutations";
import { attachmentQueries } from "./queries";
import { type AttachmentCreateInput, type AttachmentList } from "./types";
import { getQueryKey } from "@/lib/api/utils";
import { apiClient } from "@/lib/api/client";
import { useQueryState } from "@/lib/api/hooks";

/**
 * Hook for creating an attachment with cache invalidation
 */
export function useCreateAttachment() {
  const queryClient = useQueryClient();

  return attachmentMutations.create({
    onSuccess: (data) => {
      // Invalidate any queries that might be affected by this attachment
      queryClient.invalidateQueries({
        queryKey: getQueryKey(apiClient.raw.claim.getById)
      });

      // Invalidate attachments for this claim
      if (data?.claim_id) {
        queryClient.invalidateQueries({
          queryKey: getQueryKey(apiClient.raw.attachment.getByClaim, { claim_id: data.claim_id })
        });
      }
    }
  });
}

/**
 * Hook for getting attachments by claim ID
 * @param claimId The claim ID to get attachments for
 */
export function useAttachmentsByClaim(claimId: string | undefined | null) {
  return useQueryState<AttachmentList>(() =>
    attachmentQueries.getByClaim(claimId || '', {
      enabled: !!claimId
    })
  );
}
