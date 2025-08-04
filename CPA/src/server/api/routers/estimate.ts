// src/server/api/routers/estimate.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, rateLimitedProcedure, readOnlyRateLimitedProcedure } from "@/server/api/trpc";
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
  getByClaimId: readOnlyRateLimitedProcedure
    .input(z.object({ claim_id: z.string().uuid() }))
    .output(EstimateOutputSchema.nullable())
    .query(async ({ ctx, input }) => {
      try {
        // First verify claim ownership through the claims table
        const { data: claimData, error: claimError } = await ctx.supabase
          .from("claims")
          .select("id, created_by_employee_id")
          .eq("id", input.claim_id)
          .eq("created_by_employee_id", ctx.user.id)
          .single();

        if (claimError) {
          if (claimError.code === "PGRST116") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Claim not found or access denied",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to verify claim ownership: ${claimError.message}`,
            cause: claimError,
          });
        }

        // Now fetch the estimate for this claim
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
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching estimate:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  // Get estimate by ID
  getById: readOnlyRateLimitedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(EstimateOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Fetch estimate with claim ownership verification
        const { data, error } = await ctx.supabase
          .from("estimates")
          .select(`
            *,
            claims!inner(
              id,
              created_by_employee_id
            )
          `)
          .eq("id", input.id)
          .eq("claims.created_by_employee_id", ctx.user.id)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Estimate not found or access denied",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to fetch estimate: ${error.message}`,
            cause: error,
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching estimate:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  // Create a new estimate
  create: rateLimitedProcedure
    .input(EstimateCreateSchema)
    .output(EstimateOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure markup percentages have default values
        const estimateData = {
          ...input,
          special_markup_percentage: input.special_markup_percentage || 25,
          part_markup_percentage: input.part_markup_percentage || 25,
          created_by_employee_id: ctx.user.id,
          status: "draft",
          version: 1,
        };

        // Start a transaction
        const { data, error } = await ctx.supabase
          .from("estimates")
          .insert(estimateData)
          .select()
          .single();

        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to create estimate: ${error.message}`,
            cause: error,
          });
        }

        return data;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error creating estimate:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  // Get estimate lines by estimate ID
  getLinesByEstimateId: readOnlyRateLimitedProcedure
    .input(z.object({ estimate_id: z.string().uuid() }))
    .output(z.array(EstimateLineOutputSchema))
    .query(async ({ ctx, input }) => {
      try {
        // First verify estimate ownership through claims
        const { data: estimateData, error: estimateError } = await ctx.supabase
          .from("estimates")
          .select(`
            id,
            claims!inner(
              id,
              created_by_employee_id
            )
          `)
          .eq("id", input.estimate_id)
          .eq("claims.created_by_employee_id", ctx.user.id)
          .single();

        if (estimateError) {
          if (estimateError.code === "PGRST116") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Estimate not found or access denied",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to verify estimate ownership: ${estimateError.message}`,
            cause: estimateError,
          });
        }

        // Now fetch the estimate lines
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
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error fetching estimate lines:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
        });
      }
    }),

  // Create a new estimate line
  createLine: rateLimitedProcedure
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
  updateLine: rateLimitedProcedure
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
  deleteLine: rateLimitedProcedure
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

  // Bulk operations for estimate lines
  bulkCreateLines: rateLimitedProcedure
    .input(z.object({
      estimate_id: z.string().uuid(),
      lines: z.array(EstimateLineCreateSchema.omit({ estimate_id: true })).max(50) // Limit to 50 lines per batch
    }))
    .output(z.object({
      success: z.boolean(),
      created: z.array(EstimateLineOutputSchema),
      errors: z.array(z.object({
        index: z.number(),
        error: z.string()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const created: any[] = [];
        const errors: { index: number; error: string }[] = [];

        // Process each line
        for (let i = 0; i < input.lines.length; i++) {
          try {
            const lineData = { ...input.lines[i], estimate_id: input.estimate_id };
            
            // Get the next sequence number if not provided
            if (!lineData.sequence_number) {
              const { data: maxSeq } = await ctx.supabase
                .from("estimate_lines")
                .select("sequence_number")
                .eq("estimate_id", input.estimate_id)
                .order("sequence_number", { ascending: false })
                .limit(1)
                .single();

              lineData.sequence_number = (maxSeq?.sequence_number || 0) + created.length + 1;
            }

            const { data, error } = await ctx.supabase
              .from("estimate_lines")
              .insert(lineData)
              .select()
              .single();

            if (error) {
              errors.push({ index: i, error: error.message });
            } else {
              created.push(data);
            }
          } catch (error) {
            errors.push({ 
              index: i, 
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Update estimate totals
        if (created.length > 0) {
          await updateEstimateTotals(ctx, input.estimate_id);
        }

        return {
          success: errors.length === 0,
          created,
          errors
        };
      } catch (error) {
        console.error("Error in bulk create lines:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create lines in bulk",
        });
      }
    }),

  bulkUpdateLines: rateLimitedProcedure
    .input(z.object({
      estimate_id: z.string().uuid(),
      updates: z.array(EstimateLineUpdateSchema).max(50) // Limit to 50 updates per batch
    }))
    .output(z.object({
      success: z.boolean(),
      updated: z.array(EstimateLineOutputSchema),
      errors: z.array(z.object({
        id: z.string(),
        error: z.string()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        const updated: any[] = [];
        const errors: { id: string; error: string }[] = [];

        // Process each update
        for (const updateData of input.updates) {
          try {
            const { id, ...fields } = updateData;

            const { data, error } = await ctx.supabase
              .from("estimate_lines")
              .update(fields)
              .eq("id", id)
              .eq("estimate_id", input.estimate_id) // Ensure line belongs to this estimate
              .select();

            if (error) {
              errors.push({ id, error: error.message });
            } else if (!data || data.length === 0) {
              errors.push({ id, error: "Line not found or does not belong to this estimate" });
            } else if (data.length > 1) {
              errors.push({ id, error: "Multiple lines found with same ID (data corruption)" });
            } else {
              updated.push(data[0]);
            }
          } catch (error) {
            errors.push({ 
              id: updateData.id, 
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Update estimate totals
        if (updated.length > 0) {
          await updateEstimateTotals(ctx, input.estimate_id);
        }

        return {
          success: errors.length === 0,
          updated,
          errors
        };
      } catch (error) {
        console.error("Error in bulk update lines:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update lines in bulk",
        });
      }
    }),

  bulkDeleteLines: rateLimitedProcedure
    .input(z.object({
      estimate_id: z.string().uuid(),
      line_ids: z.array(z.string().uuid()).max(50) // Limit to 50 deletions per batch
    }))
    .output(z.object({
      success: z.boolean(),
      deleted: z.number(),
      errors: z.array(z.object({
        id: z.string(),
        error: z.string()
      }))
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        let deleted = 0;
        const errors: { id: string; error: string }[] = [];

        // Process each deletion
        for (const lineId of input.line_ids) {
          try {
            const { error } = await ctx.supabase
              .from("estimate_lines")
              .delete()
              .eq("id", lineId)
              .eq("estimate_id", input.estimate_id); // Ensure line belongs to this estimate

            if (error) {
              errors.push({ id: lineId, error: error.message });
            } else {
              deleted++;
            }
          } catch (error) {
            errors.push({ 
              id: lineId, 
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Update estimate totals
        if (deleted > 0) {
          await updateEstimateTotals(ctx, input.estimate_id);
        }

        return {
          success: errors.length === 0,
          deleted,
          errors
        };
      } catch (error) {
        console.error("Error in bulk delete lines:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete lines in bulk",
        });
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
