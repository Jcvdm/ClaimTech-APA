// src/lib/api/domains/attachments/queries.ts
import { apiClient } from "@/lib/api/client";
import { type QueryOptions } from "@/lib/api/client";
import { type Attachment, type AttachmentList } from "./types";

/**
 * Query functions for attachments
 */
export const attachmentQueries = {
  /**
   * Get attachments by claim ID
   * @param claimId The claim ID to get attachments for
   * @param options Additional query options
   */
  getByClaim: (claimId: string, options?: QueryOptions<AttachmentList>) =>
    apiClient.query<AttachmentList>(
      () => apiClient.raw.attachment.getByClaim.useQuery({ claim_id: claimId }),
      {
        enabled: !!claimId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        ...options
      }
    ),
};
