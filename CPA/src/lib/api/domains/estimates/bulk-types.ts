// src/lib/api/domains/estimates/bulk-types.ts
import { z } from "zod";
import { 
  EstimateLineCreateSchema, 
  EstimateLineUpdateSchema, 
  EstimateLineOutputSchema,
  OperationCode,
  PartType 
} from "./types";

// Bulk operation status tracking
export enum BulkOperationStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress", 
  COMPLETED = "completed",
  FAILED = "failed",
  PARTIAL = "partial"
}

// Bulk operation types
export enum BulkOperationType {
  CREATE = "create",
  UPDATE = "update", 
  DELETE = "delete",
  MIXED = "mixed"
}

// Individual operation result
export const BulkItemResultSchema = z.object({
  index: z.number().int().nonnegative(),
  success: z.boolean(),
  data: EstimateLineOutputSchema.nullable(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional()
  }).nullable()
});

// Bulk operation summary
export const BulkOperationSummarySchema = z.object({
  operation_id: z.string().uuid(),
  operation_type: z.nativeEnum(BulkOperationType),
  status: z.nativeEnum(BulkOperationStatus),
  total_items: z.number().int().nonnegative(),
  successful_items: z.number().int().nonnegative(),
  failed_items: z.number().int().nonnegative(),
  execution_time_ms: z.number().nonnegative(),
  estimate_id: z.string().uuid(),
  started_at: z.date(),
  completed_at: z.date().nullable(),
  batch_size: z.number().int().positive().optional(),
  errors: z.array(z.object({
    index: z.number().int().nonnegative(),
    code: z.string(),
    message: z.string()
  })).optional()
});

// Bulk create schema
export const BulkCreateEstimateLinesSchema = z.object({
  estimate_id: z.string().uuid(),
  lines: z.array(EstimateLineCreateSchema.omit({ estimate_id: true, sequence_number: true }))
    .min(1, "At least one line is required")
    .max(100, "Maximum 100 lines per bulk operation"),
  options: z.object({
    batch_size: z.number().int().positive().max(50).default(20),
    auto_sequence: z.boolean().default(true),
    fail_on_first_error: z.boolean().default(false),
    update_totals: z.boolean().default(true),
    validate_business_rules: z.boolean().default(true)
  }).optional().default({})
});

// Bulk update schema
export const BulkUpdateEstimateLinesSchema = z.object({
  estimate_id: z.string().uuid(),
  updates: z.array(z.object({
    id: z.string().uuid(),
    data: EstimateLineUpdateSchema.omit({ id: true, estimate_id: true })
  }))
    .min(1, "At least one update is required")
    .max(100, "Maximum 100 updates per bulk operation"),
  options: z.object({
    batch_size: z.number().int().positive().max(50).default(20),
    fail_on_first_error: z.boolean().default(false),
    update_totals: z.boolean().default(true),
    validate_business_rules: z.boolean().default(true),
    upsert: z.boolean().default(false)
  }).optional().default({})
});

// Bulk delete schema
export const BulkDeleteEstimateLinesSchema = z.object({
  estimate_id: z.string().uuid(),
  line_ids: z.array(z.string().uuid())
    .min(1, "At least one line ID is required")
    .max(100, "Maximum 100 deletions per bulk operation"),
  options: z.object({
    batch_size: z.number().int().positive().max(50).default(20),
    fail_on_first_error: z.boolean().default(false),
    update_totals: z.boolean().default(true),
    cascade_delete: z.boolean().default(false),
    soft_delete: z.boolean().default(false)
  }).optional().default({})
});

// Mixed bulk operations schema
export const MixedBulkOperationsSchema = z.object({
  estimate_id: z.string().uuid(),
  operations: z.array(z.discriminatedUnion("type", [
    z.object({
      type: z.literal("create"),
      data: EstimateLineCreateSchema.omit({ estimate_id: true, sequence_number: true })
    }),
    z.object({
      type: z.literal("update"),
      id: z.string().uuid(),
      data: EstimateLineUpdateSchema.omit({ id: true, estimate_id: true })
    }),
    z.object({
      type: z.literal("delete"),
      id: z.string().uuid()
    })
  ]))
    .min(1, "At least one operation is required")
    .max(100, "Maximum 100 operations per bulk request"),
  options: z.object({
    batch_size: z.number().int().positive().max(50).default(20),
    fail_on_first_error: z.boolean().default(false),
    update_totals: z.boolean().default(true),
    validate_business_rules: z.boolean().default(true),
    transaction_isolation: z.enum(["read_committed", "repeatable_read", "serializable"]).default("read_committed")
  }).optional().default({})
});

// Bulk operation response schema
export const BulkOperationResponseSchema = z.object({
  summary: BulkOperationSummarySchema,
  results: z.array(BulkItemResultSchema),
  updated_estimate: z.object({
    total_before_vat: z.number(),
    total_vat: z.number(),
    total_amount: z.number(),
    subtotal_parts: z.number(),
    subtotal_labor: z.number(),
    subtotal_paint_materials: z.number(),
    subtotal_sublet: z.number(),
    subtotal_other: z.number(),
    subtotal_special: z.number()
  }).nullable()
});

// Pagination schema for large bulk operations
export const BulkPaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
  sort_by: z.enum(["sequence_number", "created_at", "updated_at"]).default("sequence_number"),
  sort_order: z.enum(["asc", "desc"]).default("asc")
});

// Business rule validation schema
export const BusinessRuleValidationSchema = z.object({
  max_total_amount: z.number().positive().optional(),
  max_line_count: z.number().int().positive().optional(),
  required_fields: z.array(z.string()).optional(),
  allowed_operation_codes: z.array(z.nativeEnum(OperationCode)).optional(),
  allowed_part_types: z.array(z.nativeEnum(PartType)).optional()
});

// Retry configuration schema
export const RetryConfigSchema = z.object({
  max_attempts: z.number().int().positive().max(5).default(3),
  initial_delay_ms: z.number().int().positive().default(1000),
  max_delay_ms: z.number().int().positive().default(10000),
  exponential_base: z.number().positive().default(2),
  jitter: z.boolean().default(true)
});

// Performance monitoring schema
export const PerformanceMetricsSchema = z.object({
  operation_id: z.string().uuid(),
  total_execution_time_ms: z.number().nonnegative(),
  database_time_ms: z.number().nonnegative(),
  validation_time_ms: z.number().nonnegative(),
  calculation_time_ms: z.number().nonnegative(),
  items_processed: z.number().int().nonnegative(),
  throughput_items_per_second: z.number().nonnegative(),
  memory_usage_mb: z.number().nonnegative().optional(),
  database_queries_executed: z.number().int().nonnegative()
});

// TypeScript types
export type BulkItemResult = z.infer<typeof BulkItemResultSchema>;
export type BulkOperationSummary = z.infer<typeof BulkOperationSummarySchema>;
export type BulkCreateEstimateLines = z.infer<typeof BulkCreateEstimateLinesSchema>;
export type BulkUpdateEstimateLines = z.infer<typeof BulkUpdateEstimateLinesSchema>;
export type BulkDeleteEstimateLines = z.infer<typeof BulkDeleteEstimateLinesSchema>;
export type MixedBulkOperations = z.infer<typeof MixedBulkOperationsSchema>;
export type BulkOperationResponse = z.infer<typeof BulkOperationResponseSchema>;
export type BulkPagination = z.infer<typeof BulkPaginationSchema>;
export type BusinessRuleValidation = z.infer<typeof BusinessRuleValidationSchema>;
export type RetryConfig = z.infer<typeof RetryConfigSchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// Utility type for operation context
export interface BulkOperationContext {
  operation_id: string;
  user_id: string;
  estimate_id: string;
  started_at: Date;
  batch_size: number;
  performance_tracking: boolean;
}

// Error codes for bulk operations
export const BulkErrorCodes = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  DATABASE_ERROR: "DATABASE_ERROR", 
  BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
  SEQUENCE_CONFLICT: "SEQUENCE_CONFLICT",
  ESTIMATE_NOT_FOUND: "ESTIMATE_NOT_FOUND",
  LINE_NOT_FOUND: "LINE_NOT_FOUND",
  TRANSACTION_FAILED: "TRANSACTION_FAILED",
  TIMEOUT: "TIMEOUT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  CONCURRENT_MODIFICATION: "CONCURRENT_MODIFICATION"
} as const;

export type BulkErrorCode = keyof typeof BulkErrorCodes;