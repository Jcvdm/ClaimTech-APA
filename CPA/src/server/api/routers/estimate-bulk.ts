// src/server/api/routers/estimate-bulk.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, bulkRateLimitedProcedure, rateLimitedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import {
  BulkCreateEstimateLinesSchema,
  BulkUpdateEstimateLinesSchema,
  BulkDeleteEstimateLinesSchema,
  MixedBulkOperationsSchema,
  BulkOperationResponseSchema,
  BulkPaginationSchema,
  BulkOperationType,
  BulkOperationStatus,
  BulkOperationContext,
  BusinessRuleValidationSchema
} from "@/lib/api/domains/estimates/bulk-types";
import { BulkDatabaseManager } from "@/lib/api/domains/estimates/bulk-database";
import { BulkErrorHandler } from "@/lib/api/domains/estimates/bulk-error-handler";
import { BulkPerformanceOptimizer, MemoryManager } from "@/lib/api/domains/estimates/bulk-performance";
import { EstimateLineCreateSchema } from "@/lib/api/domains/estimates/types";

/**
 * Comprehensive bulk operations router for estimate lines
 * Provides efficient bulk create, update, delete, and mixed operations
 * with transaction support, error handling, and performance optimization
 */
export const estimateBulkRouter = createTRPCRouter({
  /**
   * Bulk create estimate lines with optimized batch processing
   */
  bulkCreate: bulkRateLimitedProcedure
    .input(BulkCreateEstimateLinesSchema)
    .output(BulkOperationResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const operationId = crypto.randomUUID();
      const startTime = new Date();
      
      console.log(`[estimateBulkRouter.bulkCreate] Starting bulk create operation ${operationId}`, {
        estimateId: input.estimate_id,
        itemCount: input.lines.length,
        options: input.options
      });

      // Create operation context
      const operationContext: BulkOperationContext = {
        operation_id: operationId,
        user_id: ctx.user.id,
        estimate_id: input.estimate_id,
        started_at: startTime,
        batch_size: input.options?.batch_size || 20,
        performance_tracking: true
      };

      // Initialize managers
      const dbManager = new BulkDatabaseManager(ctx.supabase, operationContext);
      const errorHandler = new BulkErrorHandler(operationContext, {
        max_attempts: 3,
        initial_delay_ms: 1000
      });
      const performanceOptimizer = new BulkPerformanceOptimizer(operationContext);
      const memoryManager = new MemoryManager(100);

      try {
        // Validate business rules
        if (input.options?.validate_business_rules !== false) {
          const validation = await errorHandler.validateBusinessRules(
            "create",
            input,
            input.options
          );

          if (!validation.valid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Business rule validation failed: ${validation.violations.join(", ")}`
            });
          }
        }

        // Verify estimate exists and belongs to user
        const estimateResult = await errorHandler.executeWithRetry(
          () => ctx.supabase
            .from("estimates")
            .select("id, status")
            .eq("id", input.estimate_id)
            .single(),
          "verify_estimate"
        );

        if (estimateResult.error || !estimateResult.data) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Estimate not found or access denied"
          });
        }

        // Optimize batch size based on data characteristics
        const optimalBatchSize = performanceOptimizer.calculateOptimalBatchSize(
          input.lines.length,
          'medium', // Complexity based on line data
          'medium'  // System load - could be dynamic
        );

        console.log(`[estimateBulkRouter.bulkCreate] Using optimal batch size: ${optimalBatchSize}`);

        // Get sequence numbers if auto-sequence is enabled
        let sequenceNumbers: number[] = [];
        if (input.options?.auto_sequence !== false) {
          sequenceNumbers = await dbManager.getNextSequenceNumbers(input.lines.length);
        }

        // Prepare lines with sequence numbers
        const linesToCreate = input.lines.map((line, index) => ({
          ...line,
          estimate_id: input.estimate_id,
          sequence_number: sequenceNumbers[index] || (index + 1)
        }));

        // Track memory usage
        const estimatedMemory = linesToCreate.length * 1024; // 1KB per line estimate
        memoryManager.trackMemoryUsage(operationId, estimatedMemory);

        // Execute bulk create with transaction
        const results = await errorHandler.executeWithRetry(
          async () => {
            // Use database transaction for atomicity
            return ctx.supabase.rpc('execute_bulk_create_estimate_lines', {
              operation_id: operationId,
              estimate_id: input.estimate_id,
              lines_data: linesToCreate,
              batch_size: optimalBatchSize,
              fail_on_first_error: input.options?.fail_on_first_error || false
            });
          },
          "bulk_create_transaction"
        );

        // If database function is not available, fall back to manual processing
        let bulkResults;
        if (results.error || !results.data) {
          console.log("[estimateBulkRouter.bulkCreate] Falling back to manual batch processing");
          bulkResults = await dbManager.batchCreateLines(linesToCreate, optimalBatchSize);
        } else {
          bulkResults = results.data;
        }

        // Process results and handle errors
        const processedResults = errorHandler.processBulkResults(
          [bulkResults],
          input.lines.length,
          BulkOperationType.CREATE
        );

        // Update estimate totals if successful items exist
        let updatedEstimate = null;
        if (processedResults.summary.successful_items > 0 && input.options?.update_totals !== false) {
          try {
            updatedEstimate = await dbManager.calculateEstimateTotals();
            
            // Update the estimate record
            await ctx.supabase
              .from("estimates")
              .update({
                ...updatedEstimate,
                updated_at: new Date().toISOString()
              })
              .eq("id", input.estimate_id);

          } catch (totalsError) {
            console.error("[estimateBulkRouter.bulkCreate] Failed to update totals:", totalsError);
            // Don't fail the operation for totals update failure
          }
        }

        // Generate performance recommendations
        const recommendations = performanceOptimizer.getPerformanceRecommendations();
        console.log(`[estimateBulkRouter.bulkCreate] Performance recommendations:`, recommendations);

        // Clean up resources
        memoryManager.releaseMemory(operationId);
        performanceOptimizer.cleanup();

        const response = {
          summary: processedResults.summary,
          results: processedResults.itemResults,
          updated_estimate: updatedEstimate
        };

        console.log(`[estimateBulkRouter.bulkCreate] Operation completed:`, {
          operationId,
          status: processedResults.summary.status,
          successful: processedResults.summary.successful_items,
          failed: processedResults.summary.failed_items,
          executionTime: processedResults.summary.execution_time_ms
        });

        return response;

      } catch (error) {
        console.error(`[estimateBulkRouter.bulkCreate] Operation failed:`, error);
        
        // Clean up resources on error
        memoryManager.releaseMemory(operationId);
        performanceOptimizer.cleanup();

        // Re-throw as appropriate TRPC error
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Bulk create operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          cause: error
        });
      }
    }),

  /**
   * Bulk update estimate lines with conflict resolution
   */
  bulkUpdate: bulkRateLimitedProcedure
    .input(BulkUpdateEstimateLinesSchema)
    .output(BulkOperationResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const operationId = crypto.randomUUID();
      const startTime = new Date();

      console.log(`[estimateBulkRouter.bulkUpdate] Starting bulk update operation ${operationId}`, {
        estimateId: input.estimate_id,
        updateCount: input.updates.length,
        options: input.options
      });

      const operationContext: BulkOperationContext = {
        operation_id: operationId,
        user_id: ctx.user.id,
        estimate_id: input.estimate_id,
        started_at: startTime,
        batch_size: input.options?.batch_size || 20,
        performance_tracking: true
      };

      const dbManager = new BulkDatabaseManager(ctx.supabase, operationContext);
      const errorHandler = new BulkErrorHandler(operationContext);
      const performanceOptimizer = new BulkPerformanceOptimizer(operationContext);
      const memoryManager = new MemoryManager(100);

      try {
        // Validate business rules
        if (input.options?.validate_business_rules !== false) {
          const validation = await errorHandler.validateBusinessRules(
            "update",
            input,
            input.options
          );

          if (!validation.valid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Business rule validation failed: ${validation.violations.join(", ")}`
            });
          }
        }

        // Optimize batch size
        const optimalBatchSize = performanceOptimizer.calculateOptimalBatchSize(
          input.updates.length,
          'medium',
          'medium'
        );

        // Track memory usage
        const estimatedMemory = input.updates.length * 1024;
        memoryManager.trackMemoryUsage(operationId, estimatedMemory);

        // Execute bulk updates
        const bulkResults = await dbManager.batchUpdateLines(
          input.updates,
          optimalBatchSize
        );

        // Process results
        const processedResults = errorHandler.processBulkResults(
          [bulkResults],
          input.updates.length,
          BulkOperationType.UPDATE
        );

        // Update estimate totals if needed
        let updatedEstimate = null;
        if (processedResults.summary.successful_items > 0 && input.options?.update_totals !== false) {
          try {
            updatedEstimate = await dbManager.calculateEstimateTotals();
            
            await ctx.supabase
              .from("estimates")
              .update({
                ...updatedEstimate,
                updated_at: new Date().toISOString()
              })
              .eq("id", input.estimate_id);

          } catch (totalsError) {
            console.error("[estimateBulkRouter.bulkUpdate] Failed to update totals:", totalsError);
          }
        }

        // Clean up
        memoryManager.releaseMemory(operationId);
        performanceOptimizer.cleanup();

        const response = {
          summary: processedResults.summary,
          results: processedResults.itemResults,
          updated_estimate: updatedEstimate
        };

        console.log(`[estimateBulkRouter.bulkUpdate] Operation completed:`, {
          operationId,
          status: processedResults.summary.status,
          successful: processedResults.summary.successful_items,
          failed: processedResults.summary.failed_items
        });

        return response;

      } catch (error) {
        console.error(`[estimateBulkRouter.bulkUpdate] Operation failed:`, error);
        
        memoryManager.releaseMemory(operationId);
        performanceOptimizer.cleanup();

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Bulk update operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          cause: error
        });
      }
    }),

  /**
   * Bulk delete estimate lines with cascade handling
   */
  bulkDelete: bulkRateLimitedProcedure
    .input(BulkDeleteEstimateLinesSchema)
    .output(BulkOperationResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const operationId = crypto.randomUUID();
      const startTime = new Date();

      console.log(`[estimateBulkRouter.bulkDelete] Starting bulk delete operation ${operationId}`, {
        estimateId: input.estimate_id,
        deleteCount: input.line_ids.length,
        options: input.options
      });

      const operationContext: BulkOperationContext = {
        operation_id: operationId,
        user_id: ctx.user.id,
        estimate_id: input.estimate_id,
        started_at: startTime,
        batch_size: input.options?.batch_size || 20,
        performance_tracking: true
      };

      const dbManager = new BulkDatabaseManager(ctx.supabase, operationContext);
      const errorHandler = new BulkErrorHandler(operationContext);
      const performanceOptimizer = new BulkPerformanceOptimizer(operationContext);
      const memoryManager = new MemoryManager(100);

      try {
        // Validate business rules
        if (input.options?.validate_business_rules !== false) {
          const validation = await errorHandler.validateBusinessRules(
            "delete",
            input,
            input.options
          );

          if (!validation.valid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Business rule validation failed: ${validation.violations.join(", ")}`
            });
          }
        }

        // Optimize batch size
        const optimalBatchSize = performanceOptimizer.calculateOptimalBatchSize(
          input.line_ids.length,
          'simple', // Deletes are typically simpler than creates/updates
          'medium'
        );

        // Track memory usage
        const estimatedMemory = input.line_ids.length * 512; // Less memory for IDs only
        memoryManager.trackMemoryUsage(operationId, estimatedMemory);

        // Execute bulk deletes
        const bulkResults = await dbManager.batchDeleteLines(
          input.line_ids,
          optimalBatchSize,
          input.options?.cascade_delete || false
        );

        // Process results - convert successful IDs to mock line objects for consistency
        const mockSuccessfulLines = bulkResults.successful.map(id => ({
          id,
          estimate_id: input.estimate_id,
          deleted: true
        }));

        const processedResults = errorHandler.processBulkResults(
          [{ successful: mockSuccessfulLines, failed: bulkResults.failed }],
          input.line_ids.length,
          BulkOperationType.DELETE
        );

        // Update estimate totals if deletions were successful
        let updatedEstimate = null;
        if (processedResults.summary.successful_items > 0 && input.options?.update_totals !== false) {
          try {
            updatedEstimate = await dbManager.calculateEstimateTotals();
            
            await ctx.supabase
              .from("estimates")
              .update({
                ...updatedEstimate,
                updated_at: new Date().toISOString()
              })
              .eq("id", input.estimate_id);

          } catch (totalsError) {
            console.error("[estimateBulkRouter.bulkDelete] Failed to update totals:", totalsError);
          }
        }

        // Clean up
        memoryManager.releaseMemory(operationId);
        performanceOptimizer.cleanup();

        const response = {
          summary: processedResults.summary,
          results: processedResults.itemResults,
          updated_estimate: updatedEstimate
        };

        console.log(`[estimateBulkRouter.bulkDelete] Operation completed:`, {
          operationId,
          status: processedResults.summary.status,
          successful: processedResults.summary.successful_items,
          failed: processedResults.summary.failed_items
        });

        return response;

      } catch (error) {
        console.error(`[estimateBulkRouter.bulkDelete] Operation failed:`, error);
        
        memoryManager.releaseMemory(operationId);
        performanceOptimizer.cleanup();

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Bulk delete operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          cause: error
        });
      }
    }),

  /**
   * Mixed bulk operations (create, update, delete in single transaction)
   */
  bulkMixed: bulkRateLimitedProcedure
    .input(MixedBulkOperationsSchema)
    .output(BulkOperationResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const operationId = crypto.randomUUID();
      const startTime = new Date();

      console.log(`[estimateBulkRouter.bulkMixed] Starting mixed bulk operation ${operationId}`, {
        estimateId: input.estimate_id,
        operationCount: input.operations.length,
        options: input.options
      });

      const operationContext: BulkOperationContext = {
        operation_id: operationId,
        user_id: ctx.user.id,
        estimate_id: input.estimate_id,
        started_at: startTime,
        batch_size: input.options?.batch_size || 20,
        performance_tracking: true
      };

      const dbManager = new BulkDatabaseManager(ctx.supabase, operationContext);
      const errorHandler = new BulkErrorHandler(operationContext);
      const performanceOptimizer = new BulkPerformanceOptimizer(operationContext);
      const memoryManager = new MemoryManager(100);

      try {
        // Validate business rules
        if (input.options?.validate_business_rules !== false) {
          const validation = await errorHandler.validateBusinessRules(
            "mixed",
            input,
            input.options
          );

          if (!validation.valid) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Business rule validation failed: ${validation.violations.join(", ")}`
            });
          }
        }

        // Separate operations by type
        const createOps = input.operations
          .filter(op => op.type === "create")
          .map(op => ({ ...op.data, estimate_id: input.estimate_id }));
        
        const updateOps = input.operations
          .filter(op => op.type === "update")
          .map(op => ({ id: op.id, data: op.data }));
        
        const deleteOps = input.operations
          .filter(op => op.type === "delete")
          .map(op => op.id);

        // Track memory usage
        const estimatedMemory = input.operations.length * 1024;
        memoryManager.trackMemoryUsage(operationId, estimatedMemory);

        // Execute operations in transaction
        const allResults: any[] = [];
        let totalSuccessful = 0;
        let totalFailed = 0;

        // Use database transaction for atomicity
        const { data: transactionResult, error: transactionError } = await ctx.supabase
          .rpc('execute_mixed_bulk_operations', {
            operation_id: operationId,
            estimate_id: input.estimate_id,
            create_operations: createOps,
            update_operations: updateOps,
            delete_operations: deleteOps,
            transaction_isolation: input.options?.transaction_isolation || "read_committed"
          });

        if (transactionError || !transactionResult) {
          console.log("[estimateBulkRouter.bulkMixed] Falling back to sequential processing");
          
          // Fall back to sequential processing
          if (createOps.length > 0) {
            // Get sequence numbers for creates
            const sequenceNumbers = await dbManager.getNextSequenceNumbers(createOps.length);
            const linesToCreate = createOps.map((line, index) => ({
              ...line,
              sequence_number: sequenceNumbers[index]
            }));

            const createResults = await dbManager.batchCreateLines(linesToCreate);
            allResults.push(createResults);
            totalSuccessful += createResults.successful.length;
            totalFailed += createResults.failed.length;
          }

          if (updateOps.length > 0) {
            const updateResults = await dbManager.batchUpdateLines(updateOps);
            allResults.push(updateResults);
            totalSuccessful += updateResults.successful.length;
            totalFailed += updateResults.failed.length;
          }

          if (deleteOps.length > 0) {
            const deleteResults = await dbManager.batchDeleteLines(deleteOps);
            const mockSuccessfulLines = deleteResults.successful.map(id => ({
              id,
              estimate_id: input.estimate_id,
              deleted: true
            }));
            allResults.push({ successful: mockSuccessfulLines, failed: deleteResults.failed });
            totalSuccessful += deleteResults.successful.length;
            totalFailed += deleteResults.failed.length;
          }
        } else {
          // Use transaction results
          allResults.push(transactionResult);
          totalSuccessful = transactionResult.successful?.length || 0;
          totalFailed = transactionResult.failed?.length || 0;
        }

        // Process results
        const processedResults = errorHandler.processBulkResults(
          allResults,
          input.operations.length,
          BulkOperationType.MIXED
        );

        // Update estimate totals
        let updatedEstimate = null;
        if (processedResults.summary.successful_items > 0 && input.options?.update_totals !== false) {
          try {
            updatedEstimate = await dbManager.calculateEstimateTotals();
            
            await ctx.supabase
              .from("estimates")
              .update({
                ...updatedEstimate,
                updated_at: new Date().toISOString()
              })
              .eq("id", input.estimate_id);

          } catch (totalsError) {
            console.error("[estimateBulkRouter.bulkMixed] Failed to update totals:", totalsError);
          }
        }

        // Clean up
        memoryManager.releaseMemory(operationId);
        performanceOptimizer.cleanup();

        const response = {
          summary: processedResults.summary,
          results: processedResults.itemResults,
          updated_estimate: updatedEstimate
        };

        console.log(`[estimateBulkRouter.bulkMixed] Operation completed:`, {
          operationId,
          status: processedResults.summary.status,
          successful: processedResults.summary.successful_items,
          failed: processedResults.summary.failed_items
        });

        return response;

      } catch (error) {
        console.error(`[estimateBulkRouter.bulkMixed] Operation failed:`, error);
        
        memoryManager.releaseMemory(operationId);
        performanceOptimizer.cleanup();

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Mixed bulk operation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          cause: error
        });
      }
    }),

  /**
   * Get paginated estimate lines with performance optimization
   */
  getPaginatedLines: rateLimitedProcedure
    .input(z.object({
      estimate_id: z.string().uuid(),
      pagination: BulkPaginationSchema.optional()
    }))
    .output(z.object({
      lines: z.array(z.any()), // EstimateLineOutputSchema array
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        totalPages: z.number(),
        hasNext: z.boolean(),
        hasPrev: z.boolean()
      }),
      performance: z.object({
        queryTime: z.number(),
        cacheHit: z.boolean()
      })
    }))
    .query(async ({ ctx, input }) => {
      const operationId = crypto.randomUUID();
      const startTime = Date.now();
      
      const pagination = input.pagination || {
        page: 1,
        limit: 20,
        sort_by: "sequence_number",
        sort_order: "asc"
      };

      const operationContext: BulkOperationContext = {
        operation_id: operationId,
        user_id: ctx.user.id,
        estimate_id: input.estimate_id,
        started_at: new Date(),
        batch_size: pagination.limit,
        performance_tracking: true
      };

      const performanceOptimizer = new BulkPerformanceOptimizer(operationContext);

      try {
        // Use caching for frequently accessed data
        const cacheKey = `lines_${input.estimate_id}_${pagination.page}_${pagination.limit}_${pagination.sort_by}_${pagination.sort_order}`;
        
        const result = await performanceOptimizer.getCachedData(
          cacheKey,
          async () => {
            const offset = (pagination.page - 1) * pagination.limit;

            // Get total count
            const { count } = await ctx.supabase
              .from("estimate_lines")
              .select("*", { count: "exact", head: true })
              .eq("estimate_id", input.estimate_id);

            // Get paginated data
            const { data: lines, error } = await ctx.supabase
              .from("estimate_lines")
              .select("*")
              .eq("estimate_id", input.estimate_id)
              .order(pagination.sort_by, { ascending: pagination.sort_order === "asc" })
              .range(offset, offset + pagination.limit - 1);

            if (error) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Failed to fetch estimate lines: ${error.message}`
              });
            }

            const totalPages = Math.ceil((count || 0) / pagination.limit);

            return {
              lines: lines || [],
              pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: count || 0,
                totalPages,
                hasNext: pagination.page < totalPages,
                hasPrev: pagination.page > 1
              }
            };
          },
          300 // 5 minute cache
        );

        const queryTime = Date.now() - startTime;
        
        return {
          ...result,
          performance: {
            queryTime,
            cacheHit: queryTime < 50 // Assume cache hit if very fast
          }
        };

      } catch (error) {
        console.error("[estimateBulkRouter.getPaginatedLines] Query failed:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get paginated lines: ${error instanceof Error ? error.message : "Unknown error"}`
        });
      } finally {
        performanceOptimizer.cleanup();
      }
    }),

  /**
   * Validate bulk operation before execution
   */
  validateBulkOperation: rateLimitedProcedure
    .input(z.object({
      estimate_id: z.string().uuid(),
      operation_type: z.nativeEnum(BulkOperationType),
      item_count: z.number().int().positive(),
      rules: BusinessRuleValidationSchema.optional()
    }))
    .output(z.object({
      valid: z.boolean(),
      violations: z.array(z.string()),
      recommendations: z.object({
        optimal_batch_size: z.number(),
        estimated_time_seconds: z.number(),
        memory_estimate_mb: z.number()
      }),
      warnings: z.array(z.string())
    }))
    .mutation(async ({ ctx, input }) => {
      const operationContext: BulkOperationContext = {
        operation_id: crypto.randomUUID(),
        user_id: ctx.user.id,
        estimate_id: input.estimate_id,
        started_at: new Date(),
        batch_size: 20,
        performance_tracking: false
      };

      const errorHandler = new BulkErrorHandler(operationContext);
      const performanceOptimizer = new BulkPerformanceOptimizer(operationContext);

      try {
        // Validate business rules
        const validation = await errorHandler.validateBusinessRules(
          input.operation_type,
          input,
          input.rules
        );

        // Get performance recommendations
        const optimalBatchSize = performanceOptimizer.calculateOptimalBatchSize(
          input.item_count,
          'medium',
          'medium'
        );

        const estimatedTimePerItem = 50; // ms
        const estimatedTime = (input.item_count * estimatedTimePerItem) / 1000; // seconds

        const memoryPerItem = 1024; // bytes
        const memoryEstimate = (input.item_count * memoryPerItem) / (1024 * 1024); // MB

        const warnings: string[] = [];
        
        if (input.item_count > 100) {
          warnings.push("Large bulk operation detected - consider splitting into smaller batches");
        }

        if (memoryEstimate > 50) {
          warnings.push("High memory usage expected - monitor system resources");
        }

        if (estimatedTime > 60) {
          warnings.push("Long operation expected - consider running during low-traffic periods");
        }

        return {
          valid: validation.valid,
          violations: validation.violations,
          recommendations: {
            optimal_batch_size: optimalBatchSize,
            estimated_time_seconds: estimatedTime,
            memory_estimate_mb: memoryEstimate
          },
          warnings
        };

      } catch (error) {
        console.error("[estimateBulkRouter.validateBulkOperation] Validation failed:", error);
        
        return {
          valid: false,
          violations: ["Validation process failed"],
          recommendations: {
            optimal_batch_size: 20,
            estimated_time_seconds: 0,
            memory_estimate_mb: 0
          },
          warnings: ["Unable to complete validation"]
        };
      } finally {
        performanceOptimizer.cleanup();
      }
    })
});