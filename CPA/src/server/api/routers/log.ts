import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { 
  ClaimLogCreateInputSchema, 
  ClaimLogOutputSchema, 
  ClaimLogsQueryInputSchema 
} from "@/lib/api/domains/logs/types";
import { TRPCError } from "@trpc/server";

export const logRouter = createTRPCRouter({
  // Create a new log entry
  create: protectedProcedure
    .input(ClaimLogCreateInputSchema)
    .output(ClaimLogOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from("claim_logs")
          .insert({
            claim_id: input.claim_id,
            user_id: ctx.user.id,
            log_type: input.log_type,
            message: input.message,
            details: input.details || null,
          })
          .select("*")
          .single();

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create log entry: ${error.message}`,
            cause: error,
          });
        }

        return data;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create log entry: ${error instanceof Error ? error.message : "Unknown error"}`,
          cause: error,
        });
      }
    }),

  // Get logs for a claim
  getByClaim: protectedProcedure
    .input(ClaimLogsQueryInputSchema)
    .output(z.array(ClaimLogOutputSchema))
    .query(async ({ ctx, input }) => {
      try {
        let query = ctx.supabase
          .from("claim_logs")
          .select("*")
          .eq("claim_id", input.claim_id)
          .order("created_at", { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        // Filter by log types if provided
        if (input.log_types && input.log_types.length > 0) {
          query = query.in("log_type", input.log_types);
        }

        const { data, error } = await query;

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch logs: ${error.message}`,
            cause: error,
          });
        }

        return data || [];
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch logs: ${error instanceof Error ? error.message : "Unknown error"}`,
          cause: error,
        });
      }
    }),

  // Delete a log entry (admin only)
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Check if user is an admin (you might need to adjust this based on your auth system)
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can delete log entries",
          });
        }

        const { error } = await ctx.supabase
          .from("claim_logs")
          .delete()
          .eq("id", input.id);

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete log entry: ${error.message}`,
            cause: error,
          });
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to delete log entry: ${error instanceof Error ? error.message : "Unknown error"}`,
          cause: error,
        });
      }
    }),
});
