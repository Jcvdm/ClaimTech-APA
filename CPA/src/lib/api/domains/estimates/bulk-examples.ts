// src/lib/api/domains/estimates/bulk-examples.ts
/**
 * Comprehensive examples and usage patterns for the bulk operations API
 * These examples demonstrate how to use the bulk operations efficiently
 * with proper error handling and performance optimization
 */

import { api } from "@/lib/api";
import { 
  BulkCreateEstimateLines,
  BulkUpdateEstimateLines,
  BulkDeleteEstimateLines,
  MixedBulkOperations,
  OperationCode,
  PartType 
} from "./bulk-types";

/**
 * Example 1: Bulk Create Estimate Lines
 * Use case: Import estimate lines from external system or template
 */
export async function exampleBulkCreate(estimateId: string) {
  const createRequest: BulkCreateEstimateLines = {
    estimate_id: estimateId,
    lines: [
      {
        description: "Front bumper - remove and refit",
        operation_code: OperationCode.REPAIR,
        part_type: PartType.DEALER,
        part_number: "BUM-FRONT-001",
        part_cost: 450.00,
        quantity: 1,
        strip_fit_hours: 2.5,
        repair_hours: 1.0,
        is_included: true
      },
      {
        description: "Front bumper paint",
        operation_code: OperationCode.PAINT,
        paint_hours: 3, // Represents panel count for materials
        is_included: true
      },
      {
        description: "Headlight replacement",
        operation_code: OperationCode.NEW,
        part_type: PartType.DEALER,
        part_number: "HL-LEFT-002",
        part_cost: 280.00,
        quantity: 1,
        strip_fit_hours: 1.0,
        is_included: true
      }
    ],
    options: {
      batch_size: 10,
      auto_sequence: true,
      fail_on_first_error: false,
      update_totals: true,
      validate_business_rules: true
    }
  };

  try {
    const result = await api.estimateBulk.bulkCreate.mutate(createRequest);
    
    console.log("Bulk create completed:", {
      operationId: result.summary.operation_id,
      status: result.summary.status,
      successful: result.summary.successful_items,
      failed: result.summary.failed_items,
      executionTime: result.summary.execution_time_ms,
      newTotals: result.updated_estimate
    });

    // Handle partial success
    if (result.summary.status === "partial") {
      console.log("Some items failed:");
      result.results.forEach((item, index) => {
        if (!item.success) {
          console.error(`Item ${index}: ${item.error?.message}`);
        }
      });
    }

    return result;
  } catch (error) {
    console.error("Bulk create failed:", error);
    throw error;
  }
}

/**
 * Example 2: Bulk Update Estimate Lines
 * Use case: Apply price changes or corrections to multiple lines
 */
export async function exampleBulkUpdate(estimateId: string, lineUpdates: Array<{id: string, changes: any}>) {
  const updateRequest: BulkUpdateEstimateLines = {
    estimate_id: estimateId,
    updates: lineUpdates.map(update => ({
      id: update.id,
      data: {
        ...update.changes,
        // Common update pattern: apply 10% price increase
        part_cost: update.changes.part_cost ? update.changes.part_cost * 1.1 : undefined
      }
    })),
    options: {
      batch_size: 15,
      fail_on_first_error: false,
      update_totals: true,
      validate_business_rules: true,
      upsert: false // Don't create if not exists
    }
  };

  try {
    const result = await api.estimateBulk.bulkUpdate.mutate(updateRequest);
    
    console.log("Bulk update completed:", {
      status: result.summary.status,
      successful: result.summary.successful_items,
      failed: result.summary.failed_items
    });

    return result;
  } catch (error) {
    console.error("Bulk update failed:", error);
    throw error;
  }
}

/**
 * Example 3: Bulk Delete Estimate Lines
 * Use case: Remove multiple lines based on criteria
 */
export async function exampleBulkDelete(estimateId: string, lineIdsToDelete: string[]) {
  const deleteRequest: BulkDeleteEstimateLines = {
    estimate_id: estimateId,
    line_ids: lineIdsToDelete,
    options: {
      batch_size: 20,
      fail_on_first_error: false,
      update_totals: true,
      cascade_delete: false,
      soft_delete: false
    }
  };

  try {
    const result = await api.estimateBulk.bulkDelete.mutate(deleteRequest);
    
    console.log("Bulk delete completed:", {
      status: result.summary.status,
      successful: result.summary.successful_items,
      failed: result.summary.failed_items
    });

    return result;
  } catch (error) {
    console.error("Bulk delete failed:", error);
    throw error;
  }
}

/**
 * Example 4: Mixed Bulk Operations
 * Use case: Complex estimate updates with creates, updates, and deletes
 */
export async function exampleMixedOperations(estimateId: string) {
  const mixedRequest: MixedBulkOperations = {
    estimate_id: estimateId,
    operations: [
      // Create new lines
      {
        type: "create",
        data: {
          description: "New part addition",
          operation_code: OperationCode.NEW,
          part_cost: 150.00,
          quantity: 1,
          is_included: true
        }
      },
      // Update existing line
      {
        type: "update",
        id: "existing-line-id-1",
        data: {
          part_cost: 200.00,
          quantity: 2
        }
      },
      // Delete unwanted line
      {
        type: "delete",
        id: "unwanted-line-id"
      }
    ],
    options: {
      batch_size: 10,
      fail_on_first_error: false,
      update_totals: true,
      validate_business_rules: true,
      transaction_isolation: "read_committed"
    }
  };

  try {
    const result = await api.estimateBulk.bulkMixed.mutate(mixedRequest);
    
    console.log("Mixed operations completed:", {
      status: result.summary.status,
      successful: result.summary.successful_items,
      failed: result.summary.failed_items
    });

    return result;
  } catch (error) {
    console.error("Mixed operations failed:", error);
    throw error;
  }
}

/**
 * Example 5: Paginated Data Loading with Performance Optimization
 * Use case: Load large datasets efficiently with caching
 */
export async function examplePaginatedLoading(estimateId: string) {
  try {
    const firstPage = await api.estimateBulk.getPaginatedLines.query({
      estimate_id: estimateId,
      pagination: {
        page: 1,
        limit: 20,
        sort_by: "sequence_number",
        sort_order: "asc"
      }
    });

    console.log("First page loaded:", {
      itemCount: firstPage.lines.length,
      totalItems: firstPage.pagination.total,
      totalPages: firstPage.pagination.totalPages,
      cacheHit: firstPage.performance.cacheHit,
      queryTime: firstPage.performance.queryTime
    });

    // Load remaining pages if needed
    const allLines = [...firstPage.lines];
    
    for (let page = 2; page <= firstPage.pagination.totalPages; page++) {
      const pageData = await api.estimateBulk.getPaginatedLines.query({
        estimate_id: estimateId,
        pagination: {
          page,
          limit: 20,
          sort_by: "sequence_number",
          sort_order: "asc"
        }
      });
      
      allLines.push(...pageData.lines);
    }

    console.log(`Loaded ${allLines.length} total lines`);
    return allLines;
  } catch (error) {
    console.error("Paginated loading failed:", error);
    throw error;
  }
}

/**
 * Example 6: Pre-operation Validation
 * Use case: Validate bulk operation before execution
 */
export async function exampleValidation(estimateId: string, itemCount: number) {
  try {
    const validation = await api.estimateBulk.validateBulkOperation.mutate({
      estimate_id: estimateId,
      operation_type: "create",
      item_count: itemCount,
      rules: {
        max_total_amount: 50000,
        max_line_count: 100,
        required_fields: ["description", "operation_code"],
        allowed_operation_codes: [OperationCode.NEW, OperationCode.REPAIR, OperationCode.PAINT]
      }
    });

    console.log("Validation result:", {
      valid: validation.valid,
      violations: validation.violations,
      recommendations: validation.recommendations,
      warnings: validation.warnings
    });

    if (!validation.valid) {
      console.error("Validation failed:", validation.violations);
      return false;
    }

    console.log("Operation recommendations:", {
      optimalBatchSize: validation.recommendations.optimal_batch_size,
      estimatedTime: validation.recommendations.estimated_time_seconds,
      memoryEstimate: validation.recommendations.memory_estimate_mb
    });

    return true;
  } catch (error) {
    console.error("Validation failed:", error);
    return false;
  }
}

/**
 * Example 7: Error Recovery and Retry Pattern
 * Use case: Handle failures gracefully with retry logic
 */
export async function exampleErrorRecovery(estimateId: string, lines: any[]) {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // Validate first
      const isValid = await exampleValidation(estimateId, lines.length);
      if (!isValid) {
        throw new Error("Validation failed");
      }

      // Attempt bulk create
      const result = await api.estimateBulk.bulkCreate.mutate({
        estimate_id: estimateId,
        lines,
        options: {
          batch_size: 10, // Smaller batch for better reliability
          fail_on_first_error: false,
          update_totals: true
        }
      });

      // Check if we need to retry failed items
      if (result.summary.status === "partial" && result.summary.failed_items > 0) {
        console.log(`Attempt ${retryCount + 1}: ${result.summary.failed_items} items failed`);
        
        // Extract failed items for retry
        const failedLines = result.results
          .filter(item => !item.success)
          .map(item => lines[item.index])
          .filter(Boolean);

        if (failedLines.length > 0 && retryCount < maxRetries - 1) {
          retryCount++;
          lines = failedLines; // Retry only failed items
          
          // Exponential backoff
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          console.log(`Retrying ${failedLines.length} failed items (attempt ${retryCount + 1})...`);
          continue;
        }
      }

      console.log("Bulk operation completed:", {
        finalStatus: result.summary.status,
        totalAttempts: retryCount + 1,
        successful: result.summary.successful_items,
        failed: result.summary.failed_items
      });

      return result;
    } catch (error) {
      retryCount++;
      console.error(`Attempt ${retryCount} failed:`, error);
      
      if (retryCount >= maxRetries) {
        console.error("Max retries exceeded");
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Example 8: Performance Monitoring and Optimization
 * Use case: Monitor and optimize bulk operation performance
 */
export async function examplePerformanceMonitoring(estimateId: string, lines: any[]) {
  const startTime = Date.now();
  
  try {
    // Start with validation to get recommendations
    const validation = await exampleValidation(estimateId, lines.length);
    
    if (!validation.valid) {
      throw new Error("Pre-validation failed");
    }

    // Use recommended batch size
    const optimalBatchSize = validation.recommendations.optimal_batch_size;
    
    const result = await api.estimateBulk.bulkCreate.mutate({
      estimate_id: estimateId,
      lines,
      options: {
        batch_size: optimalBatchSize,
        fail_on_first_error: false,
        update_totals: true
      }
    });

    const totalTime = Date.now() - startTime;
    const throughput = lines.length / (totalTime / 1000);

    console.log("Performance metrics:", {
      totalExecutionTime: totalTime,
      dbExecutionTime: result.summary.execution_time_ms,
      throughputItemsPerSecond: throughput,
      batchSize: optimalBatchSize,
      successRate: (result.summary.successful_items / result.summary.total_items) * 100
    });

    // Log performance recommendations for future operations
    if (throughput < 10) {
      console.warn("Low throughput detected. Consider:");
      console.warn("- Increasing batch size");
      console.warn("- Reducing data complexity");
      console.warn("- Checking database performance");
    }

    return result;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error("Operation failed after", totalTime, "ms:", error);
    throw error;
  }
}

/**
 * Utility Functions for Common Patterns
 */

// Chunk array into smaller batches
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

// Retry with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries - 1) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Validate estimate line data
export function validateEstimateLineData(line: any): string[] {
  const errors: string[] = [];
  
  if (!line.description || line.description.trim().length === 0) {
    errors.push("Description is required");
  }
  
  if (!line.operation_code) {
    errors.push("Operation code is required");
  }
  
  if (line.part_cost && (typeof line.part_cost !== "number" || line.part_cost < 0)) {
    errors.push("Part cost must be a non-negative number");
  }
  
  if (line.quantity && (typeof line.quantity !== "number" || line.quantity <= 0)) {
    errors.push("Quantity must be a positive number");
  }
  
  return errors;
}