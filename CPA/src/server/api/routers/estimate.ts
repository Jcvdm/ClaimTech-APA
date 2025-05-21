// src/server/api/routers/estimate.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import {
  EstimateCreateSchema,
  EstimateOutputSchema,
  EstimateLineCreateSchema,
  EstimateLineUpdateSchema,
  EstimateLineOutputSchema,
} from "@/lib/api/domains/estimates/types";
import { TRPCError } from "@trpc/server";

export const estimateRouter = createTRPCRouter({
  // Get estimate by claim ID
  getByClaimId: publicProcedure
    .input(z.object({ claim_id: z.string().uuid() }))
    .output(EstimateOutputSchema.nullable())
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from("estimates")
          .select("*")
          .eq("claim_id", input.claim_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            // No estimate found for this claim
            return null;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch estimate: ${error.message}`,
            cause: error,
          });
        }

        return data;
      } catch (error) {
        console.error("Error fetching estimate:", error);
        throw error;
      }
    }),

  // Get estimate by ID
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(EstimateOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from("estimates")
          .select("*")
          .eq("id", input.id)
          .single();

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch estimate: ${error.message}`,
            cause: error,
          });
        }

        return data;
      } catch (error) {
        console.error("Error fetching estimate:", error);
        throw error;
      }
    }),

  // Create a new estimate
  create: protectedProcedure
    .input(EstimateCreateSchema)
    .output(EstimateOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[estimateRouter] Creating estimate with input:", input);
        console.log("[estimateRouter] User context:", ctx.user);

        // Ensure markup percentages have default values
        const estimateData = {
          ...input,
          special_markup_percentage: input.special_markup_percentage || 25,
          part_markup_percentage: input.part_markup_percentage || 25,
          created_by_employee_id: ctx.user.id,
          status: "draft",
          version: 1,
        };

        console.log("[estimateRouter] Prepared estimate data:", estimateData);

        // Start a transaction
        const { data, error } = await ctx.supabase
          .from("estimates")
          .insert(estimateData)
          .select()
          .single();

        if (error) {
          console.error("[estimateRouter] Supabase error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create estimate: ${error.message}`,
            cause: error,
          });
        }

        console.log("[estimateRouter] Estimate created successfully:", data);
        return data;
      } catch (error) {
        console.error("[estimateRouter] Error creating estimate:", error);
        throw error;
      }
    }),

  // Get estimate lines by estimate ID
  getLinesByEstimateId: publicProcedure
    .input(z.object({ estimate_id: z.string().uuid() }))
    .output(z.array(EstimateLineOutputSchema))
    .query(async ({ ctx, input }) => {
      try {
        const { data, error } = await ctx.supabase
          .from("estimate_lines")
          .select("*")
          .eq("estimate_id", input.estimate_id)
          .order("sequence_number", { ascending: true });

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch estimate lines: ${error.message}`,
            cause: error,
          });
        }

        return data || [];
      } catch (error) {
        console.error("Error fetching estimate lines:", error);
        throw error;
      }
    }),

  // Create a new estimate line
  createLine: protectedProcedure
    .input(EstimateLineCreateSchema)
    .output(EstimateLineOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log("[estimateRouter.createLine] Creating estimate line with input:", JSON.stringify(input, null, 2));

        // Get the next sequence number if not provided
        if (!input.sequence_number) {
          console.log("[estimateRouter.createLine] Sequence number not provided, calculating next sequence number");

          const { data: maxSeq, error: seqError } = await ctx.supabase
            .from("estimate_lines")
            .select("sequence_number")
            .eq("estimate_id", input.estimate_id)
            .order("sequence_number", { ascending: false })
            .limit(1)
            .single();

          if (seqError && seqError.code !== "PGRST116") { // PGRST116 is "no rows returned" which is fine
            console.error("[estimateRouter.createLine] Error fetching max sequence number:", seqError);
          }

          input.sequence_number = (maxSeq?.sequence_number || 0) + 1;
          console.log("[estimateRouter.createLine] Using sequence number:", input.sequence_number);
        }

        console.log("[estimateRouter.createLine] Final input data:", JSON.stringify(input, null, 2));

        // Insert the new line
        const { data, error } = await ctx.supabase
          .from("estimate_lines")
          .insert(input)
          .select()
          .single();

        if (error) {
          console.error("[estimateRouter.createLine] Supabase error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create estimate line: ${error.message}`,
            cause: error,
          });
        }

        console.log("[estimateRouter.createLine] Line created successfully:", JSON.stringify(data, null, 2));

        // Update the estimate totals
        await updateEstimateTotals(ctx, input.estimate_id);
        console.log("[estimateRouter.createLine] Estimate totals updated");

        return data;
      } catch (error) {
        console.error("[estimateRouter.createLine] Error creating estimate line:", error);
        throw error;
      }
    }),

  // Update an estimate line
  updateLine: protectedProcedure
    .input(EstimateLineUpdateSchema)
    .output(EstimateLineOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updateData } = input;

        const { data, error } = await ctx.supabase
          .from("estimate_lines")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update estimate line: ${error.message}`,
            cause: error,
          });
        }

        // Update the estimate totals
        await updateEstimateTotals(ctx, data.estimate_id);

        return data;
      } catch (error) {
        console.error("Error updating estimate line:", error);
        throw error;
      }
    }),

  // Delete an estimate line
  deleteLine: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Get the estimate_id before deleting
        const { data: line } = await ctx.supabase
          .from("estimate_lines")
          .select("estimate_id")
          .eq("id", input.id)
          .single();

        if (!line) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Estimate line not found",
          });
        }

        const { error } = await ctx.supabase
          .from("estimate_lines")
          .delete()
          .eq("id", input.id);

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete estimate line: ${error.message}`,
            cause: error,
          });
        }

        // Update the estimate totals
        await updateEstimateTotals(ctx, line.estimate_id);

        return { success: true };
      } catch (error) {
        console.error("Error deleting estimate line:", error);
        throw error;
      }
    }),
});

// Helper function to update estimate totals
async function updateEstimateTotals(ctx: any, estimateId: string) {
  try {
    // Get all lines for this estimate
    const { data: lines } = await ctx.supabase
      .from("estimate_lines")
      .select("*")
      .eq("estimate_id", estimateId)
      .eq("is_included", true);

    if (!lines || lines.length === 0) {
      // Reset totals to zero if no lines
      await ctx.supabase
        .from("estimates")
        .update({
          subtotal_parts: 0,
          subtotal_labor: 0,
          subtotal_paint_materials: 0,
          subtotal_sublet: 0,
          subtotal_other: 0,
          subtotal_special: 0,
          total_before_vat: 0,
          total_vat: 0,
          total_amount: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", estimateId);
      return;
    }

    // Get the estimate for rates
    const { data: estimate } = await ctx.supabase
      .from("estimates")
      .select("*")
      .eq("id", estimateId)
      .single();

    if (!estimate) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Estimate not found",
      });
    }

    // Calculate totals
    let subtotalParts = 0;
    let subtotalLabor = 0;
    let subtotalPaintMaterials = 0;
    let subtotalSublet = 0;
    let subtotalOther = 0;
    let subtotalSpecial = 0;

    for (const line of lines) {
      // Calculate part total with markup
      if (line.part_cost && line.quantity) {
        let partTotal = line.part_cost * line.quantity;

        // Apply part markup only to parts
        if (estimate.part_markup_percentage) {
          partTotal += partTotal * (estimate.part_markup_percentage / 100);
        }

        subtotalParts += partTotal;
      }

      // Calculate labor total using single labor rate
      const laborHours = (line.strip_fit_hours || 0) + (line.repair_hours || 0);
      if (laborHours > 0 && estimate.panel_labor_rate) {
        subtotalLabor += laborHours * estimate.panel_labor_rate;
      }

      // Calculate paint material total based on panel count, not hours
      // No markup on paint materials
      if (line.paint_hours && estimate.paint_material_rate) {
        // Paint hours now represents panel count
        subtotalPaintMaterials += line.paint_hours * estimate.paint_material_rate;
      }

      // Add sublet cost
      if (line.sublet_cost) {
        subtotalSublet += line.sublet_cost;
      }

      // Handle special services with special markup
      if (line.operation_code === 'SC' && line.sublet_cost) {
        let specialCost = line.sublet_cost;

        // Apply special markup if available
        // Default to 15% if not set
        const specialMarkupPercentage = estimate.special_markup_percentage || 15;
        specialCost += specialCost * (specialMarkupPercentage / 100);

        subtotalSpecial += specialCost;
        // Remove from sublet since we're counting it in special
        subtotalSublet -= line.sublet_cost;
      }
    }

    // Calculate totals
    const totalBeforeVat = subtotalParts + subtotalLabor + subtotalPaintMaterials + subtotalSublet + subtotalOther + subtotalSpecial;
    const totalVat = totalBeforeVat * (estimate.vat_rate_percentage / 100);
    const totalAmount = totalBeforeVat + totalVat;

    // Update the estimate
    await ctx.supabase
      .from("estimates")
      .update({
        subtotal_parts: subtotalParts,
        subtotal_labor: subtotalLabor,
        subtotal_paint_materials: subtotalPaintMaterials,
        subtotal_sublet: subtotalSublet,
        subtotal_other: subtotalOther,
        subtotal_special: subtotalSpecial,
        total_before_vat: totalBeforeVat,
        total_vat: totalVat,
        total_amount: totalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", estimateId);
  } catch (error) {
    console.error("Error updating estimate totals:", error);
    throw error;
  }
}
