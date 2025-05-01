import "server-only";
import { cache } from "react";
import { createServerCaller } from "@/lib/api/utils/createServerCaller";
import { type AttachmentList } from "./types";

/**
 * Server-side prefetch for attachments related to a claim
 * This function is cached using React's cache() to deduplicate requests
 */
export const prefetchAttachmentsServer = cache(async (claimId: string) => {
  try {
    console.log(`[Server Prefetch] Prefetching attachments for claim ${claimId}`);

    // Create a tRPC caller for server-side
    const caller = await createServerCaller();

    const attachments = await caller.attachment.getByClaim({ claim_id: claimId })
      .catch((error: Error) => {
        console.error(`[Server Prefetch] Error fetching attachments for claim ${claimId}:`, error);
        return null;
      });

    if (attachments) {
      console.log(`[Server Prefetch] Successfully prefetched ${attachments.length} attachments for claim ${claimId}`);
      return attachments;
    } else {
      console.warn(`[Server Prefetch] No attachments found for claim ${claimId}`);
      return [];
    }
  } catch (error) {
    console.error(`[Server Prefetch] Error prefetching attachments for claim ${claimId}:`, error);
    // Return empty array instead of throwing to prevent the page from failing to render
    return [];
  }
});
