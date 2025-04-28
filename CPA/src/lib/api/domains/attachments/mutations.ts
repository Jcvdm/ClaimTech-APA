import { apiClient } from "@/lib/api/client";
import { type MutationOptions } from "@/lib/api/client";
import { toast } from "sonner";
import { type Attachment, type AttachmentCreateInput } from "./types";

/**
 * Mutation functions for attachments
 */
export const attachmentMutations = {
  /**
   * Create a new attachment
   */
  create: (options?: MutationOptions<Attachment, AttachmentCreateInput>) =>
    apiClient.mutation<Attachment, AttachmentCreateInput>(
      () => apiClient.raw.attachment.create.useMutation(),
      {
        onSuccess: (data, variables) => {
          toast.success("Attachment uploaded successfully");
          options?.onSuccess?.(data, variables);
        },
        ...options
      }
    )
};
