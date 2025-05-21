import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

export const lookupRouter = createTRPCRouter({
  getProvinces: publicProcedure
    .input(z.object({}).optional())
    .output(z.array(z.object({ id: z.string().uuid(), name: z.string() })))
    .query(async ({ ctx }) => {
      console.log("[lookupRouter] Executing getProvinces procedure...");
      try {
        const { data, error } = await ctx.supabase.from("provinces").select("id, name").order("name");

        if (error) {
          console.error("[lookupRouter] Error fetching provinces from Supabase:", error);
          return []; // Return empty array instead of throwing
        }

        if (!data || !Array.isArray(data)) {
          console.warn("[lookupRouter] No provinces data or invalid format:", data);
          return [];
        }

        // Ensure the data is in the correct format
        const formattedData = data.map(province => ({
          id: province.id,
          name: province.name
        }));

        console.log("[lookupRouter] Successfully fetched provinces data:", formattedData);
        return formattedData;
      } catch (error) {
        console.error("[lookupRouter] Error in getProvinces procedure:", error);
        return []; // Return empty array instead of throwing
      }
    }),

  getLossAdjusters: publicProcedure
    .input(z.object({}).optional())
    .output(z.array(z.object({ id: z.string().uuid(), name: z.string() })))
    .query(async ({ ctx }) => {
      console.log("[lookupRouter] Executing getLossAdjusters procedure...");
      try {
        // Check if user is authenticated
        const user = ctx.user;
        if (!user) {
          console.log("[lookupRouter] No authenticated user, returning empty loss adjusters array");
          return [];
        }

        const { data, error } = await ctx.supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "loss_adjuster")
          .eq("is_active", true)
          .order("full_name");

        if (error) {
          console.error("[lookupRouter] Error fetching loss adjusters:", error);
          throw new Error("Failed to fetch loss adjusters");
        }

        // Map the data to match the expected output format
        const formattedData = data.map(adjuster => ({
          id: adjuster.id,
          name: adjuster.full_name
        }));

        console.log("[lookupRouter] Successfully fetched loss adjusters data:", formattedData);
        return formattedData;
      } catch (error) {
        console.error("[lookupRouter] Error in getLossAdjusters procedure:", error);
        // Return empty array instead of throwing to prevent the page from failing to render
        return [];
      }
    }),
});