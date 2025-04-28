import { type RouterOutputs, type RouterInputs } from "@/lib/api/types";

/**
 * Input type for creating an attachment
 */
export type AttachmentCreateInput = RouterInputs["attachment"]["create"];

/**
 * Input type for getting attachments by claim ID
 */
export type AttachmentGetByClaimInput = RouterInputs["attachment"]["getByClaim"];

/**
 * Output type for an attachment
 */
export type Attachment = RouterOutputs["attachment"]["create"];

/**
 * Output type for a list of attachments
 */
export type AttachmentList = RouterOutputs["attachment"]["getByClaim"];
