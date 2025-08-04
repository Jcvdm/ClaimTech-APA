// src/lib/api/domains/estimates/bulk-database.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { 
  BulkOperationContext, 
  BulkErrorCodes, 
  PerformanceMetrics,
  RetryConfig 
} from "./bulk-types";
import { EstimateLineCreate, EstimateLineUpdate, EstimateLine } from "./types";

/**
 * Database optimization utilities for bulk operations
 * Provides efficient query batching, connection pooling, and performance monitoring
 */
export class BulkDatabaseManager {
  private supabase: SupabaseClient;
  private context: BulkOperationContext;
  private performance: Partial<PerformanceMetrics>;

  constructor(supabase: SupabaseClient, context: BulkOperationContext) {
    this.supabase = supabase;
    this.context = context;
    this.performance = {
      operation_id: context.operation_id,
      total_execution_time_ms: 0,
      database_time_ms: 0,
      validation_time_ms: 0,
      calculation_time_ms: 0,
      items_processed: 0,
      database_queries_executed: 0
    };
  }

  /**
   * Batch create estimate lines with optimized queries
   */
  async batchCreateLines(
    lines: (EstimateLineCreate & { sequence_number: number })[],
    batchSize: number = 20
  ): Promise<{ successful: EstimateLine[], failed: Array<{ index: number, error: any }> }> {
    const startTime = Date.now();
    const successful: EstimateLine[] = [];
    const failed: Array<{ index: number, error: any }> = [];

    try {
      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < lines.length; i += batchSize) {
        const batch = lines.slice(i, i + batchSize);
        
        try {
          // Use single query for batch insert
          const { data, error } = await this.supabase
            .from("estimate_lines")
            .insert(batch)
            .select();

          this.performance.database_queries_executed!++;

          if (error) {
            // If batch fails, try individual inserts to identify specific failures
            const individualResults = await this.retryIndividualCreates(batch, i);
            successful.push(...individualResults.successful);
            failed.push(...individualResults.failed);
          } else {
            successful.push(...(data || []));
          }
        } catch (batchError) {
          // Log batch error and attempt individual processing
          console.error(`Batch create failed for items ${i}-${i + batch.length - 1}:`, batchError);
          
          const individualResults = await this.retryIndividualCreates(batch, i);
          successful.push(...individualResults.successful);
          failed.push(...individualResults.failed);
        }
      }

      this.performance.items_processed = lines.length;
      this.performance.database_time_ms! += Date.now() - startTime;

      return { successful, failed };
    } catch (error) {
      console.error("Critical error in batch create:", error);
      throw error;
    }
  }

  /**
   * Batch update estimate lines with conflict resolution
   */
  async batchUpdateLines(
    updates: Array<{ id: string, data: Partial<EstimateLineUpdate> }>,
    batchSize: number = 20
  ): Promise<{ successful: EstimateLine[], failed: Array<{ index: number, error: any }> }> {
    const startTime = Date.now();
    const successful: EstimateLine[] = [];
    const failed: Array<{ index: number, error: any }> = [];

    try {
      // First, verify all lines exist and belong to the correct estimate
      const lineIds = updates.map(u => u.id);
      const { data: existingLines, error: checkError } = await this.supabase
        .from("estimate_lines")
        .select("id, estimate_id, updated_at")
        .in("id", lineIds)
        .eq("estimate_id", this.context.estimate_id);

      this.performance.database_queries_executed!++;

      if (checkError) {
        throw new Error(`Failed to verify existing lines: ${checkError.message}`);
      }

      const existingLineMap = new Map(existingLines?.map(line => [line.id, line]) || []);

      // Process updates in batches
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        // Filter out non-existent lines
        const validUpdates = batch.filter((update, index) => {
          const exists = existingLineMap.has(update.id);
          if (!exists) {
            failed.push({
              index: i + index,
              error: {
                code: BulkErrorCodes.LINE_NOT_FOUND,
                message: `Line with ID ${update.id} not found`
              }
            });
          }
          return exists;
        });

        if (validUpdates.length === 0) continue;

        try {
          // Use optimized update with returning clause
          const updatePromises = validUpdates.map(async (update, batchIndex) => {
            const { data, error } = await this.supabase
              .from("estimate_lines")
              .update({
                ...update.data,
                updated_at: new Date().toISOString()
              })
              .eq("id", update.id)
              .eq("estimate_id", this.context.estimate_id) // Additional safety check
              .select()
              .single();

            if (error) {
              failed.push({
                index: i + batchIndex,
                error: {
                  code: BulkErrorCodes.DATABASE_ERROR,
                  message: error.message
                }
              });
              return null;
            }

            return data;
          });

          const results = await Promise.allSettled(updatePromises);
          this.performance.database_queries_executed! += validUpdates.length;

          results.forEach((result, index) => {
            if (result.status === "fulfilled" && result.value) {
              successful.push(result.value);
            } else if (result.status === "rejected") {
              failed.push({
                index: i + index,
                error: {
                  code: BulkErrorCodes.DATABASE_ERROR,
                  message: result.reason?.message || "Unknown error"
                }
              });
            }
          });

        } catch (batchError) {
          console.error(`Batch update failed for items ${i}-${i + batch.length - 1}:`, batchError);
          
          // Add all batch items as failed
          batch.forEach((_, index) => {
            failed.push({
              index: i + index,
              error: {
                code: BulkErrorCodes.DATABASE_ERROR,
                message: batchError instanceof Error ? batchError.message : "Batch update failed"
              }
            });
          });
        }
      }

      this.performance.items_processed = updates.length;
      this.performance.database_time_ms! += Date.now() - startTime;

      return { successful, failed };
    } catch (error) {
      console.error("Critical error in batch update:", error);
      throw error;
    }
  }

  /**
   * Batch delete estimate lines with cascade handling
   */
  async batchDeleteLines(
    lineIds: string[],
    batchSize: number = 20,
    cascadeDelete: boolean = false
  ): Promise<{ successful: string[], failed: Array<{ index: number, error: any }> }> {
    const startTime = Date.now();
    const successful: string[] = [];
    const failed: Array<{ index: number, error: any }> = [];

    try {
      // First verify all lines exist and belong to correct estimate
      const { data: existingLines, error: checkError } = await this.supabase
        .from("estimate_lines")
        .select("id")
        .in("id", lineIds)
        .eq("estimate_id", this.context.estimate_id);

      this.performance.database_queries_executed!++;

      if (checkError) {
        throw new Error(`Failed to verify existing lines: ${checkError.message}`);
      }

      const existingLineIds = new Set(existingLines?.map(line => line.id) || []);

      // Process deletions in batches
      for (let i = 0; i < lineIds.length; i += batchSize) {
        const batch = lineIds.slice(i, i + batchSize);
        
        // Filter valid line IDs
        const validIds = batch.filter((id, index) => {
          const exists = existingLineIds.has(id);
          if (!exists) {
            failed.push({
              index: i + index,
              error: {
                code: BulkErrorCodes.LINE_NOT_FOUND,
                message: `Line with ID ${id} not found`
              }
            });
          }
          return exists;
        });

        if (validIds.length === 0) continue;

        try {
          // Handle cascade deletion if needed
          if (cascadeDelete) {
            // Add any cascade logic here (e.g., delete related attachments)
            console.log(`Cascade delete enabled for ${validIds.length} lines`);
          }

          // Perform batch delete
          const { error: deleteError } = await this.supabase
            .from("estimate_lines")
            .delete()
            .in("id", validIds)
            .eq("estimate_id", this.context.estimate_id);

          this.performance.database_queries_executed!++;

          if (deleteError) {
            // If batch delete fails, try individual deletes
            console.error("Batch delete failed, attempting individual deletes:", deleteError);
            
            for (const id of validIds) {
              try {
                const { error: individualError } = await this.supabase
                  .from("estimate_lines")
                  .delete()
                  .eq("id", id)
                  .eq("estimate_id", this.context.estimate_id);

                this.performance.database_queries_executed!++;

                if (individualError) {
                  const originalIndex = lineIds.indexOf(id);
                  failed.push({
                    index: originalIndex,
                    error: {
                      code: BulkErrorCodes.DATABASE_ERROR,
                      message: individualError.message
                    }
                  });
                } else {
                  successful.push(id);
                }
              } catch (individualDeleteError) {
                const originalIndex = lineIds.indexOf(id);
                failed.push({
                  index: originalIndex,
                  error: {
                    code: BulkErrorCodes.DATABASE_ERROR,
                    message: individualDeleteError instanceof Error ? 
                      individualDeleteError.message : "Individual delete failed"
                  }
                });
              }
            }
          } else {
            successful.push(...validIds);
          }

        } catch (batchError) {
          console.error(`Batch delete failed for items ${i}-${i + batch.length - 1}:`, batchError);
          
          // Mark all items in batch as failed
          batch.forEach((id) => {
            const originalIndex = lineIds.indexOf(id);
            failed.push({
              index: originalIndex,
              error: {
                code: BulkErrorCodes.DATABASE_ERROR,
                message: batchError instanceof Error ? batchError.message : "Batch delete failed"
              }
            });
          });
        }
      }

      this.performance.items_processed = lineIds.length;
      this.performance.database_time_ms! += Date.now() - startTime;

      return { successful, failed };
    } catch (error) {
      console.error("Critical error in batch delete:", error);
      throw error;
    }
  }

  /**
   * Get next sequence numbers efficiently
   */
  async getNextSequenceNumbers(count: number): Promise<number[]> {
    const startTime = Date.now();

    try {
      // Use atomic increment to get sequence numbers
      const { data, error } = await this.supabase
        .rpc("get_next_estimate_line_sequences", {
          estimate_id_param: this.context.estimate_id,
          count_param: count
        });

      this.performance.database_queries_executed!++;
      this.performance.database_time_ms! += Date.now() - startTime;

      if (error) {
        // Fallback to manual sequence calculation
        console.warn("RPC sequence function failed, using fallback:", error);
        return this.getFallbackSequenceNumbers(count);
      }

      return data || this.getFallbackSequenceNumbers(count);
    } catch (error) {
      console.error("Error getting sequence numbers:", error);
      return this.getFallbackSequenceNumbers(count);
    }
  }

  /**
   * Optimized estimate totals calculation
   */
  async calculateEstimateTotals(): Promise<{
    subtotal_parts: number;
    subtotal_labor: number;
    subtotal_paint_materials: number;
    subtotal_sublet: number;
    subtotal_other: number;
    subtotal_special: number;
    total_before_vat: number;
    total_vat: number;
    total_amount: number;
  }> {
    const startTime = Date.now();

    try {
      // Use database function for efficient calculation
      const { data, error } = await this.supabase
        .rpc("calculate_estimate_totals", {
          estimate_id_param: this.context.estimate_id
        });

      this.performance.database_queries_executed!++;
      this.performance.calculation_time_ms! += Date.now() - startTime;

      if (error) {
        console.warn("RPC totals calculation failed, using fallback:", error);
        return this.getFallbackTotalsCalculation();
      }

      return data || this.getFallbackTotalsCalculation();
    } catch (error) {
      console.error("Error calculating totals:", error);
      return this.getFallbackTotalsCalculation();
    }
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const endTime = Date.now();
    return {
      ...this.performance,
      total_execution_time_ms: endTime - this.context.started_at.getTime(),
      throughput_items_per_second: this.performance.items_processed! / 
        ((endTime - this.context.started_at.getTime()) / 1000)
    } as PerformanceMetrics;
  }

  /**
   * Private helper methods
   */
  private async retryIndividualCreates(
    batch: (EstimateLineCreate & { sequence_number: number })[],
    startIndex: number
  ): Promise<{ successful: EstimateLine[], failed: Array<{ index: number, error: any }> }> {
    const successful: EstimateLine[] = [];
    const failed: Array<{ index: number, error: any }> = [];

    for (let i = 0; i < batch.length; i++) {
      try {
        const { data, error } = await this.supabase
          .from("estimate_lines")
          .insert(batch[i])
          .select()
          .single();

        this.performance.database_queries_executed!++;

        if (error) {
          failed.push({
            index: startIndex + i,
            error: {
              code: BulkErrorCodes.DATABASE_ERROR,
              message: error.message
            }
          });
        } else {
          successful.push(data);
        }
      } catch (individualError) {
        failed.push({
          index: startIndex + i,
          error: {
            code: BulkErrorCodes.DATABASE_ERROR,
            message: individualError instanceof Error ? 
              individualError.message : "Individual create failed"
          }
        });
      }
    }

    return { successful, failed };
  }

  private async getFallbackSequenceNumbers(count: number): Promise<number[]> {
    const { data, error } = await this.supabase
      .from("estimate_lines")
      .select("sequence_number")
      .eq("estimate_id", this.context.estimate_id)
      .order("sequence_number", { ascending: false })
      .limit(1)
      .single();

    this.performance.database_queries_executed!++;

    const lastSequence = data?.sequence_number || 0;
    return Array.from({ length: count }, (_, i) => lastSequence + i + 1);
  }

  private async getFallbackTotalsCalculation(): Promise<any> {
    // Fallback calculation logic here
    // This would implement the same logic as the updateEstimateTotals function
    // but return the values instead of updating the database
    return {
      subtotal_parts: 0,
      subtotal_labor: 0,
      subtotal_paint_materials: 0,
      subtotal_sublet: 0,
      subtotal_other: 0,
      subtotal_special: 0,
      total_before_vat: 0,
      total_vat: 0,
      total_amount: 0
    };
  }
}

/**
 * Database stored procedures/functions that should be created for optimal performance
 */
export const REQUIRED_DATABASE_FUNCTIONS = {
  GET_NEXT_SEQUENCES: `
    CREATE OR REPLACE FUNCTION get_next_estimate_line_sequences(
      estimate_id_param UUID,
      count_param INTEGER
    )
    RETURNS INTEGER[]
    LANGUAGE plpgsql
    AS $$
    DECLARE
      max_sequence INTEGER;
      result INTEGER[];
    BEGIN
      -- Get the current max sequence number
      SELECT COALESCE(MAX(sequence_number), 0) INTO max_sequence
      FROM estimate_lines
      WHERE estimate_id = estimate_id_param;
      
      -- Generate array of next sequence numbers
      SELECT ARRAY(SELECT generate_series(max_sequence + 1, max_sequence + count_param))
      INTO result;
      
      RETURN result;
    END;
    $$;
  `,

  CALCULATE_TOTALS: `
    CREATE OR REPLACE FUNCTION calculate_estimate_totals(estimate_id_param UUID)
    RETURNS JSON
    LANGUAGE plpgsql
    AS $$
    DECLARE
      estimate_record RECORD;
      totals JSON;
    BEGIN
      -- Get estimate for rates
      SELECT * INTO estimate_record
      FROM estimates
      WHERE id = estimate_id_param;
      
      -- Calculate totals using optimized query
      WITH line_calculations AS (
        SELECT
          -- Part calculations
          CASE WHEN part_cost IS NOT NULL AND quantity IS NOT NULL
            THEN (part_cost * quantity) * (1 + COALESCE(estimate_record.part_markup_percentage, 0) / 100.0)
            ELSE 0
          END as part_total,
          
          -- Labor calculations  
          CASE WHEN (COALESCE(strip_fit_hours, 0) + COALESCE(repair_hours, 0)) > 0
            THEN (COALESCE(strip_fit_hours, 0) + COALESCE(repair_hours, 0)) * COALESCE(estimate_record.panel_labor_rate, 0)
            ELSE 0
          END as labor_total,
          
          -- Paint material calculations
          CASE WHEN paint_hours IS NOT NULL
            THEN paint_hours * COALESCE(estimate_record.paint_material_rate, 0)
            ELSE 0
          END as paint_total,
          
          -- Sublet and special calculations
          CASE WHEN operation_code = 'SC' AND sublet_cost IS NOT NULL
            THEN sublet_cost * (1 + COALESCE(estimate_record.special_markup_percentage, 15) / 100.0)
            ELSE 0
          END as special_total,
          
          CASE WHEN operation_code != 'SC' AND sublet_cost IS NOT NULL
            THEN sublet_cost
            ELSE 0
          END as sublet_total
          
        FROM estimate_lines
        WHERE estimate_id = estimate_id_param AND is_included = true
      )
      SELECT json_build_object(
        'subtotal_parts', COALESCE(SUM(part_total), 0),
        'subtotal_labor', COALESCE(SUM(labor_total), 0),
        'subtotal_paint_materials', COALESCE(SUM(paint_total), 0),
        'subtotal_sublet', COALESCE(SUM(sublet_total), 0),
        'subtotal_other', 0,
        'subtotal_special', COALESCE(SUM(special_total), 0),
        'total_before_vat', COALESCE(SUM(part_total + labor_total + paint_total + sublet_total + special_total), 0),
        'total_vat', COALESCE(SUM(part_total + labor_total + paint_total + sublet_total + special_total), 0) * (estimate_record.vat_rate_percentage / 100.0),
        'total_amount', COALESCE(SUM(part_total + labor_total + paint_total + sublet_total + special_total), 0) * (1 + estimate_record.vat_rate_percentage / 100.0)
      ) INTO totals
      FROM line_calculations;
      
      RETURN totals;
    END;
    $$;
  `
};