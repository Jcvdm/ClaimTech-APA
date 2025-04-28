import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

export const lookupRouter = createTRPCRouter({
  getProvinces: publicProcedure
    .input(z.void())
    .output(z.array(z.object({ id: z.string().uuid(), name: z.string() })))
    .query(async ({ ctx }) => {
      console.log("[lookupRouter] Executing getProvinces procedure...");
      const { data, error } = await ctx.supabase.from("provinces").select("id, name").order("name");

      if (error) {
        console.error("[lookupRouter] Error fetching provinces from Supabase:", error);
        throw new Error("Failed to fetch provinces");
      }

      console.log("[lookupRouter] Successfully fetched provinces data:", data);
      return data;
    }),

  getLossAdjusters: protectedProcedure
    .input(z.void())
    .output(z.array(z.object({ id: z.string().uuid(), full_name: z.string() })))
    .query(async ({ ctx }) => {
      const { data, error } = await ctx.supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "loss_adjuster")
        .eq("is_active", true)
        .order("full_name");

      if (error) {
        console.error("Error fetching loss adjusters:", error);
        throw new Error("Failed to fetch loss adjusters");
      }

      return data;
    }),
});