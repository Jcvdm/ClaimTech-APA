// src/lib/api/domains/estimates/bulk-error-handler.ts
import { TRPCError } from "@trpc/server";
import { 
  BulkErrorCodes, 
  BulkItemResult, 
  BulkOperationStatus,
  BulkOperationSummary,
  RetryConfig,
  BulkOperationContext
} from "./bulk-types";

/**
 * Enhanced error handling for bulk operations with partial success support
 */
export class BulkErrorHandler {
  private context: BulkOperationContext;
  private retryConfig: RetryConfig;
  private errorCounts: Map<string, number>;

  constructor(context: BulkOperationContext, retryConfig?: Partial<RetryConfig>) {
    this.context = context;
    this.retryConfig = {
      max_attempts: 3,
      initial_delay_ms: 1000,
      max_delay_ms: 10000,
      exponential_base: 2,
      jitter: true,
      ...retryConfig
    };
    this.errorCounts = new Map();
  }

  /**
   * Process bulk operation results with intelligent error handling
   */
  processBulkResults<T>(
    results: Array<{ successful: T[], failed: Array<{ index: number, error: any }> }>,
    totalItems: number,
    operation: string
  ): {
    summary: BulkOperationSummary;
    itemResults: BulkItemResult[];
    shouldRetry: boolean;
    retryableItems: number[];
  } {
    const itemResults: BulkItemResult[] = new Array(totalItems);
    const errorsByCode = new Map<string, number>();
    let successfulCount = 0;
    let failedCount = 0;
    const retryableItems: number[] = [];

    // Initialize all results as pending
    for (let i = 0; i < totalItems; i++) {
      itemResults[i] = {
        index: i,
        success: false,
        data: null,
        error: null
      };
    }

    // Process successful items
    results.forEach(batch => {
      batch.successful.forEach((item, batchIndex) => {
        const globalIndex = this.findGlobalIndex(item, batchIndex);
        if (globalIndex >= 0 && globalIndex < totalItems) {
          itemResults[globalIndex] = {
            index: globalIndex,
            success: true,
            data: item as any,
            error: null
          };
          successfulCount++;
        }
      });

      // Process failed items
      batch.failed.forEach(failure => {
        const { index, error } = failure;
        if (index >= 0 && index < totalItems) {
          const errorCode = this.categorizeError(error);
          const isRetryable = this.isRetryableError(errorCode);
          
          itemResults[index] = {
            index,
            success: false,
            data: null,
            error: {
              code: errorCode,
              message: this.formatErrorMessage(error),
              details: this.extractErrorDetails(error)
            }
          };

          failedCount++;
          errorsByCode.set(errorCode, (errorsByCode.get(errorCode) || 0) + 1);

          if (isRetryable) {
            retryableItems.push(index);
          }
        }
      });
    });

    // Determine overall status
    const status = this.determineOperationStatus(successfulCount, failedCount, totalItems);
    
    // Check if retry is warranted
    const shouldRetry = this.shouldRetryOperation(retryableItems.length, totalItems, errorsByCode);

    const summary: BulkOperationSummary = {
      operation_id: this.context.operation_id,
      operation_type: operation as any,
      status,
      total_items: totalItems,
      successful_items: successfulCount,
      failed_items: failedCount,
      execution_time_ms: Date.now() - this.context.started_at.getTime(),
      estimate_id: this.context.estimate_id,
      started_at: this.context.started_at,
      completed_at: new Date(),
      batch_size: this.context.batch_size,
      errors: this.summarizeErrors(errorsByCode)
    };

    return {
      summary,
      itemResults,
      shouldRetry,
      retryableItems
    };
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    itemIndex?: number
  ): Promise<T> {
    let lastError: any;
    const attempts = this.retryConfig.max_attempts;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await operation();
        
        // Reset error count on success
        if (itemIndex !== undefined) {
          this.errorCounts.delete(`${operationName}_${itemIndex}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        const errorCode = this.categorizeError(error);
        const isRetryable = this.isRetryableError(errorCode);
        
        // Track error count
        const errorKey = itemIndex !== undefined ? `${operationName}_${itemIndex}` : operationName;
        this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);

        console.error(`Attempt ${attempt}/${attempts} failed for ${operationName}:`, {
          error: this.formatErrorMessage(error),
          errorCode,
          isRetryable,
          itemIndex
        });

        // Don't retry on final attempt or non-retryable errors
        if (attempt === attempts || !isRetryable) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(
          this.retryConfig.initial_delay_ms * Math.pow(this.retryConfig.exponential_base, attempt - 1),
          this.retryConfig.max_delay_ms
        );

        const delay = this.retryConfig.jitter 
          ? baseDelay + Math.random() * baseDelay * 0.1 
          : baseDelay;

        await this.sleep(delay);
      }
    }

    // Transform final error into appropriate TRPC error
    throw this.transformToTRPCError(lastError, operationName);
  }

  /**
   * Create detailed error report for failed bulk operation
   */
  createErrorReport(
    summary: BulkOperationSummary,
    itemResults: BulkItemResult[]
  ): {
    report: string;
    recommendations: string[];
    retryStrategy: string;
  } {
    const failedItems = itemResults.filter(item => !item.success);
    const errorsByCode = new Map<string, number>();
    
    failedItems.forEach(item => {
      if (item.error) {
        errorsByCode.set(item.error.code, (errorsByCode.get(item.error.code) || 0) + 1);
      }
    });

    const report = this.generateErrorReport(summary, errorsByCode, failedItems);
    const recommendations = this.generateRecommendations(errorsByCode);
    const retryStrategy = this.generateRetryStrategy(errorsByCode, summary);

    return {
      report,
      recommendations,
      retryStrategy
    };
  }

  /**
   * Validate business rules before bulk operation
   */
  async validateBusinessRules(
    operation: string,
    data: any,
    rules?: any
  ): Promise<{ valid: boolean; violations: string[] }> {
    const violations: string[] = [];

    try {
      // Validate estimate exists and is accessible
      if (!this.context.estimate_id) {
        violations.push("Estimate ID is required");
      }

      // Operation-specific validations
      switch (operation) {
        case "create":
          violations.push(...this.validateCreateRules(data, rules));
          break;
        case "update":
          violations.push(...this.validateUpdateRules(data, rules));
          break;
        case "delete":
          violations.push(...this.validateDeleteRules(data, rules));
          break;
      }

      return {
        valid: violations.length === 0,
        violations
      };
    } catch (error) {
      console.error("Error validating business rules:", error);
      return {
        valid: false,
        violations: ["Business rule validation failed"]
      };
    }
  }

  /**
   * Private helper methods
   */
  private categorizeError(error: any): string {
    if (!error) return BulkErrorCodes.DATABASE_ERROR;

    const errorMessage = error.message || error.toString().toLowerCase();
    const errorCode = error.code || "";

    // Database constraint violations
    if (errorCode === "23505" || errorMessage.includes("duplicate")) {
      return BulkErrorCodes.SEQUENCE_CONFLICT;
    }

    if (errorCode === "23503" || errorMessage.includes("foreign key")) {
      return BulkErrorCodes.ESTIMATE_NOT_FOUND;
    }

    if (errorCode === "23502" || errorMessage.includes("null value")) {
      return BulkErrorCodes.VALIDATION_FAILED;
    }

    // Timeout errors
    if (errorMessage.includes("timeout") || errorMessage.includes("connection")) {
      return BulkErrorCodes.TIMEOUT;
    }

    // Rate limiting
    if (errorMessage.includes("rate limit") || errorMessage.includes("too many")) {
      return BulkErrorCodes.RATE_LIMIT_EXCEEDED;
    }

    // Concurrency issues
    if (errorMessage.includes("concurrent") || errorMessage.includes("lock")) {
      return BulkErrorCodes.CONCURRENT_MODIFICATION;
    }

    // Business rule violations
    if (errorMessage.includes("business rule") || errorMessage.includes("invalid operation")) {
      return BulkErrorCodes.BUSINESS_RULE_VIOLATION;
    }

    // Default to database error
    return BulkErrorCodes.DATABASE_ERROR;
  }

  private isRetryableError(errorCode: string): boolean {
    const retryableErrors = [
      BulkErrorCodes.TIMEOUT,
      BulkErrorCodes.RATE_LIMIT_EXCEEDED,
      BulkErrorCodes.CONCURRENT_MODIFICATION,
      BulkErrorCodes.DATABASE_ERROR
    ];

    return retryableErrors.includes(errorCode as any);
  }

  private formatErrorMessage(error: any): string {
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    return "Unknown error occurred";
  }

  private extractErrorDetails(error: any): Record<string, any> {
    const details: Record<string, any> = {};

    if (error?.code) details.code = error.code;
    if (error?.hint) details.hint = error.hint;
    if (error?.details) details.details = error.details;
    if (error?.constraint) details.constraint = error.constraint;

    return Object.keys(details).length > 0 ? details : undefined;
  }

  private determineOperationStatus(
    successful: number, 
    failed: number, 
    total: number
  ): BulkOperationStatus {
    if (failed === 0) return BulkOperationStatus.COMPLETED;
    if (successful === 0) return BulkOperationStatus.FAILED;
    return BulkOperationStatus.PARTIAL;
  }

  private shouldRetryOperation(
    retryableCount: number,
    totalItems: number,
    errorsByCode: Map<string, number>
  ): boolean {
    const retryThreshold = Math.min(totalItems * 0.1, 10); // Max 10% or 10 items
    const hasRetryableErrors = retryableCount > 0;
    const hasNonRetryableErrors = errorsByCode.has(BulkErrorCodes.VALIDATION_FAILED) ||
                                   errorsByCode.has(BulkErrorCodes.BUSINESS_RULE_VIOLATION);

    return hasRetryableErrors && retryableCount <= retryThreshold && !hasNonRetryableErrors;
  }

  private summarizeErrors(errorsByCode: Map<string, number>): Array<{index: number, code: string, message: string}> {
    const errors: Array<{index: number, code: string, message: string}> = [];
    
    errorsByCode.forEach((count, code) => {
      errors.push({
        index: -1, // Summary level error
        code,
        message: `${count} items failed with ${code}`
      });
    });

    return errors;
  }

  private findGlobalIndex(item: any, batchIndex: number): number {
    // This would need to be implemented based on how items are tracked
    // For now, return batchIndex as a placeholder
    return batchIndex;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private transformToTRPCError(error: any, operationName: string): TRPCError {
    const errorCode = this.categorizeError(error);
    
    switch (errorCode) {
      case BulkErrorCodes.VALIDATION_FAILED:
        return new TRPCError({
          code: "BAD_REQUEST",
          message: `Validation failed for ${operationName}: ${this.formatErrorMessage(error)}`
        });

      case BulkErrorCodes.ESTIMATE_NOT_FOUND:
      case BulkErrorCodes.LINE_NOT_FOUND:
        return new TRPCError({
          code: "NOT_FOUND",
          message: `Resource not found for ${operationName}: ${this.formatErrorMessage(error)}`
        });

      case BulkErrorCodes.BUSINESS_RULE_VIOLATION:
        return new TRPCError({
          code: "FORBIDDEN",
          message: `Business rule violation for ${operationName}: ${this.formatErrorMessage(error)}`
        });

      case BulkErrorCodes.TIMEOUT:
        return new TRPCError({
          code: "TIMEOUT",
          message: `Operation timeout for ${operationName}: ${this.formatErrorMessage(error)}`
        });

      default:
        return new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Internal error for ${operationName}: ${this.formatErrorMessage(error)}`
        });
    }
  }

  private generateErrorReport(
    summary: BulkOperationSummary,
    errorsByCode: Map<string, number>,
    failedItems: BulkItemResult[]
  ): string {
    const lines = [
      `Bulk Operation Report - ${summary.operation_type}`,
      `Operation ID: ${summary.operation_id}`,
      `Status: ${summary.status}`,
      `Total Items: ${summary.total_items}`,
      `Successful: ${summary.successful_items}`,
      `Failed: ${summary.failed_items}`,
      `Execution Time: ${summary.execution_time_ms}ms`,
      "",
      "Error Breakdown:"
    ];

    errorsByCode.forEach((count, code) => {
      lines.push(`  ${code}: ${count} items`);
    });

    if (failedItems.length > 0 && failedItems.length <= 10) {
      lines.push("", "Failed Item Details:");
      failedItems.forEach(item => {
        lines.push(`  Index ${item.index}: ${item.error?.message}`);
      });
    }

    return lines.join("\n");
  }

  private generateRecommendations(errorsByCode: Map<string, number>): string[] {
    const recommendations: string[] = [];

    if (errorsByCode.has(BulkErrorCodes.VALIDATION_FAILED)) {
      recommendations.push("Review input data for validation errors");
      recommendations.push("Ensure all required fields are provided");
    }

    if (errorsByCode.has(BulkErrorCodes.SEQUENCE_CONFLICT)) {
      recommendations.push("Use auto-sequence option to avoid conflicts");
      recommendations.push("Check for concurrent modifications");
    }

    if (errorsByCode.has(BulkErrorCodes.TIMEOUT)) {
      recommendations.push("Reduce batch size for better performance");
      recommendations.push("Consider splitting operation into smaller chunks");
    }

    if (errorsByCode.has(BulkErrorCodes.RATE_LIMIT_EXCEEDED)) {
      recommendations.push("Implement exponential backoff");
      recommendations.push("Reduce operation frequency");
    }

    return recommendations;
  }

  private generateRetryStrategy(
    errorsByCode: Map<string, number>,
    summary: BulkOperationSummary
  ): string {
    const retryableErrorCount = Array.from(errorsByCode.entries())
      .filter(([code]) => this.isRetryableError(code))
      .reduce((sum, [, count]) => sum + count, 0);

    if (retryableErrorCount === 0) {
      return "No retryable errors found. Manual intervention required.";
    }

    if (retryableErrorCount / summary.total_items > 0.5) {
      return "High failure rate. Review system resources and try smaller batches.";
    }

    return `${retryableErrorCount} items can be retried. Use exponential backoff with ${this.retryConfig.initial_delay_ms}ms initial delay.`;
  }

  private validateCreateRules(data: any, rules?: any): string[] {
    const violations: string[] = [];
    
    if (data?.lines?.length > 100) {
      violations.push("Maximum 100 lines per bulk create operation");
    }

    return violations;
  }

  private validateUpdateRules(data: any, rules?: any): string[] {
    const violations: string[] = [];
    
    if (data?.updates?.length > 100) {
      violations.push("Maximum 100 updates per bulk update operation");
    }

    return violations;
  }

  private validateDeleteRules(data: any, rules?: any): string[] {
    const violations: string[] = [];
    
    if (data?.line_ids?.length > 100) {
      violations.push("Maximum 100 deletions per bulk delete operation");
    }

    return violations;
  }
}