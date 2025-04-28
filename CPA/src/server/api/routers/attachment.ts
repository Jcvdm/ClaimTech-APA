import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";

export const AttachmentCreateInputSchema = z.object({
  claim_id: z.string().uuid(),
  file_path: z.string(),
  file_name: z.string(),
  mime_type: z.string(),
  file_size: z.number(),
});

export const AttachmentOutputSchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(),
  file_path: z.string(),
  file_name: z.string(),
  mime_type: z.string(),
  file_size: z.number(),
  uploaded_by_employee_id: z.string(),
  created_at: z.string().datetime(),
});

export const attachmentRouter = createTRPCRouter({
  create: protectedProcedure
    .input(AttachmentCreateInputSchema)
    .output(AttachmentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const { claim_id, file_path, file_name, mime_type, file_size } = input;

      const { data, error } = await ctx.supabase
        .from("attachments")
        .insert({
          claim_id,
          file_path,
          file_name,
          mime_type,
          file_size,
          uploaded_by_employee_id: ctx.user.id,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create attachment: ${error.message}`);
      }

      return data;
    }),

  // Get attachments by claim ID
  getByClaim: publicProcedure
    .input(z.object({ claim_id: z.string().uuid() }))
    .output(z.array(AttachmentOutputSchema))
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from("attachments")
          .select("*")
          .eq("claim_id", input.claim_id)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error(`Failed to fetch attachments: ${error.message}`);
        }

        return data || [];
      } catch (error) {
        console.error("Error fetching attachments:", error);
        throw error;
      }
    }),
});
