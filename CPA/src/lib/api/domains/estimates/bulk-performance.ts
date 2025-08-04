// src/lib/api/domains/estimates/bulk-performance.ts
import { 
  BulkPagination, 
  PerformanceMetrics, 
  BulkOperationContext 
} from "./bulk-types";

/**
 * Performance optimization utilities for bulk operations
 */
export class BulkPerformanceOptimizer {
  private context: BulkOperationContext;
  private cache: Map<string, { data: any; expiry: number }>;
  private connectionPool: ConnectionPoolManager;
  private metricsCollector: MetricsCollector;

  constructor(context: BulkOperationContext) {
    this.context = context;
    this.cache = new Map();
    this.connectionPool = new ConnectionPoolManager();
    this.metricsCollector = new MetricsCollector(context.operation_id);
  }

  /**
   * Optimize batch size based on system performance and data characteristics
   */
  calculateOptimalBatchSize(
    itemCount: number,
    itemComplexity: 'simple' | 'medium' | 'complex' = 'medium',
    systemLoad: 'low' | 'medium' | 'high' = 'medium'
  ): number {
    // Base batch sizes by complexity
    const baseSizes = {
      simple: 50,
      medium: 20,
      complex: 10
    };

    // Adjust for system load
    const loadMultipliers = {
      low: 1.5,
      medium: 1.0,
      high: 0.5
    };

    let optimalSize = baseSizes[itemComplexity] * loadMultipliers[systemLoad];

    // Adjust based on total item count
    if (itemCount < 10) {
      optimalSize = Math.min(optimalSize, itemCount);
    } else if (itemCount > 1000) {
      optimalSize = Math.max(optimalSize * 0.8, 5); // Reduce for very large operations
    }

    // Ensure reasonable bounds
    return Math.max(1, Math.min(50, Math.floor(optimalSize)));
  }

  /**
   * Implement intelligent pagination for large datasets
   */
  createPaginationStrategy(
    totalItems: number,
    pagination: BulkPagination
  ): {
    pages: Array<{ offset: number; limit: number; page: number }>;
    estimatedTime: number;
    memoryEstimate: number;
  } {
    const pages: Array<{ offset: number; limit: number; page: number }> = [];
    const itemsPerPage = Math.min(pagination.limit, this.calculateOptimalBatchSize(totalItems));
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    for (let page = 1; page <= totalPages; page++) {
      const offset = (page - 1) * itemsPerPage;
      const limit = Math.min(itemsPerPage, totalItems - offset);
      
      pages.push({ offset, limit, page });
    }

    // Estimate processing time (based on historical data)
    const avgItemProcessingTime = this.getAverageProcessingTime();
    const estimatedTime = totalItems * avgItemProcessingTime;

    // Estimate memory usage
    const avgItemMemory = 1024; // 1KB per item estimate
    const memoryEstimate = totalItems * avgItemMemory / (1024 * 1024); // MB

    return {
      pages,
      estimatedTime,
      memoryEstimate
    };
  }

  /**
   * Advanced caching with TTL and invalidation strategies
   */
  async getCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 300
  ): Promise<T> {
    const cacheKey = `${this.context.operation_id}_${key}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && cached.expiry > now) {
      this.metricsCollector.recordCacheHit(key);
      return cached.data;
    }

    this.metricsCollector.recordCacheMiss(key);
    const data = await fetcher();
    
    this.cache.set(cacheKey, {
      data,
      expiry: now + (ttlSeconds * 1000)
    });

    return data;
  }

  /**
   * Invalidate cache entries
   */
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Monitor and optimize database connection usage
   */
  async optimizeConnection<T>(operation: () => Promise<T>): Promise<T> {
    const connection = await this.connectionPool.acquire();
    const startTime = Date.now();

    try {
      const result = await operation();
      this.metricsCollector.recordConnectionUsage(Date.now() - startTime);
      return result;
    } finally {
      this.connectionPool.release(connection);
    }
  }

  /**
   * Get performance recommendations based on metrics
   */
  getPerformanceRecommendations(): {
    recommendations: string[];
    optimizations: string[];
    warnings: string[];
  } {
    const metrics = this.metricsCollector.getMetrics();
    const recommendations: string[] = [];
    const optimizations: string[] = [];
    const warnings: string[] = [];

    // Analyze throughput
    if (metrics.throughput_items_per_second < 10) {
      recommendations.push("Consider increasing batch size for better throughput");
      optimizations.push("Enable connection pooling if not already active");
    }

    // Analyze cache performance
    const cacheHitRate = metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses);
    if (cacheHitRate < 0.3) {
      recommendations.push("Increase cache TTL for frequently accessed data");
      optimizations.push("Pre-warm cache for predictable access patterns");
    }

    // Analyze memory usage
    if (metrics.memory_usage_mb && metrics.memory_usage_mb > 100) {
      warnings.push("High memory usage detected - consider smaller batch sizes");
      recommendations.push("Implement streaming for large datasets");
    }

    // Analyze database performance
    if (metrics.database_time_ms > metrics.total_execution_time_ms * 0.8) {
      warnings.push("Database operations consuming >80% of execution time");
      recommendations.push("Review query optimization and indexing strategies");
      optimizations.push("Consider implementing query result caching");
    }

    return {
      recommendations,
      optimizations,
      warnings
    };
  }

  /**
   * Get real-time performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return this.metricsCollector.getMetrics();
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    this.connectionPool.cleanup();
  }

  private getAverageProcessingTime(): number {
    // This would be based on historical metrics
    // For now, return a reasonable estimate
    return 50; // 50ms per item
  }
}

/**
 * Connection pool manager for optimizing database connections
 */
class ConnectionPoolManager {
  private activeConnections: Set<string>;
  private maxConnections: number;
  private connectionQueue: Array<(connection: string) => void>;

  constructor(maxConnections: number = 10) {
    this.activeConnections = new Set();
    this.maxConnections = maxConnections;
    this.connectionQueue = [];
  }

  async acquire(): Promise<string> {
    return new Promise((resolve) => {
      if (this.activeConnections.size < this.maxConnections) {
        const connectionId = `conn_${Date.now()}_${Math.random()}`;
        this.activeConnections.add(connectionId);
        resolve(connectionId);
      } else {
        this.connectionQueue.push(resolve);
      }
    });
  }

  release(connectionId: string): void {
    this.activeConnections.delete(connectionId);
    
    if (this.connectionQueue.length > 0) {
      const nextWaiter = this.connectionQueue.shift();
      if (nextWaiter) {
        const newConnectionId = `conn_${Date.now()}_${Math.random()}`;
        this.activeConnections.add(newConnectionId);
        nextWaiter(newConnectionId);
      }
    }
  }

  getStats(): {
    active: number;
    waiting: number;
    utilization: number;
  } {
    return {
      active: this.activeConnections.size,
      waiting: this.connectionQueue.length,
      utilization: this.activeConnections.size / this.maxConnections
    };
  }

  cleanup(): void {
    this.activeConnections.clear();
    this.connectionQueue.length = 0;
  }
}

/**
 * Metrics collector for performance monitoring
 */
class MetricsCollector {
  private operationId: string;
  private startTime: number;
  private metrics: Partial<PerformanceMetrics>;
  private cacheHits: number;
  private cacheMisses: number;
  private connectionUsageTimes: number[];

  constructor(operationId: string) {
    this.operationId = operationId;
    this.startTime = Date.now();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.connectionUsageTimes = [];
    this.metrics = {
      operation_id: operationId,
      total_execution_time_ms: 0,
      database_time_ms: 0,
      validation_time_ms: 0,
      calculation_time_ms: 0,
      items_processed: 0,
      throughput_items_per_second: 0,
      database_queries_executed: 0
    };
  }

  recordCacheHit(key: string): void {
    this.cacheHits++;
  }

  recordCacheMiss(key: string): void {
    this.cacheMisses++;
  }

  recordConnectionUsage(durationMs: number): void {
    this.connectionUsageTimes.push(durationMs);
  }

  recordDatabaseTime(durationMs: number): void {
    this.metrics.database_time_ms = (this.metrics.database_time_ms || 0) + durationMs;
  }

  recordValidationTime(durationMs: number): void {
    this.metrics.validation_time_ms = (this.metrics.validation_time_ms || 0) + durationMs;
  }

  recordCalculationTime(durationMs: number): void {
    this.metrics.calculation_time_ms = (this.metrics.calculation_time_ms || 0) + durationMs;
  }

  recordItemsProcessed(count: number): void {
    this.metrics.items_processed = (this.metrics.items_processed || 0) + count;
  }

  recordDatabaseQuery(): void {
    this.metrics.database_queries_executed = (this.metrics.database_queries_executed || 0) + 1;
  }

  getMetrics(): PerformanceMetrics {
    const now = Date.now();
    const totalTime = now - this.startTime;
    const throughput = this.metrics.items_processed! / (totalTime / 1000);

    return {
      ...this.metrics,
      total_execution_time_ms: totalTime,
      throughput_items_per_second: throughput,
      cache_hits: this.cacheHits,
      cache_misses: this.cacheMisses,
      avg_connection_time_ms: this.connectionUsageTimes.length > 0 
        ? this.connectionUsageTimes.reduce((sum, time) => sum + time, 0) / this.connectionUsageTimes.length
        : 0
    } as PerformanceMetrics & { cache_hits: number; cache_misses: number; avg_connection_time_ms: number };
  }
}

/**
 * Query optimization utilities
 */
export class QueryOptimizer {
  /**
   * Create optimized WHERE clauses for bulk operations
   */
  static createOptimizedWhereClause(
    ids: string[],
    chunkSize: number = 100
  ): Array<{ clause: string; values: string[] }> {
    const chunks: Array<{ clause: string; values: string[] }> = [];
    
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      chunks.push({
        clause: `id = ANY($1)`,
        values: [chunk]
      });
    }

    return chunks;
  }

  /**
   * Generate optimal ORDER BY clauses for pagination
   */
  static createPaginationOrderBy(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    additionalFields: string[] = []
  ): string {
    const orderFields = [sortBy, ...additionalFields];
    return orderFields
      .map(field => `${field} ${sortOrder.toUpperCase()}`)
      .join(', ');
  }

  /**
   * Create efficient LIMIT/OFFSET clauses
   */
  static createPaginationLimit(
    page: number,
    limit: number
  ): { limit: number; offset: number } {
    return {
      limit,
      offset: (page - 1) * limit
    };
  }
}

/**
 * Memory management utilities
 */
export class MemoryManager {
  private memoryUsage: Map<string, number>;
  private gcThreshold: number;

  constructor(gcThresholdMB: number = 100) {
    this.memoryUsage = new Map();
    this.gcThreshold = gcThresholdMB * 1024 * 1024; // Convert to bytes
  }

  /**
   * Track memory usage for a specific operation
   */
  trackMemoryUsage(operationId: string, sizeBytes: number): void {
    this.memoryUsage.set(operationId, sizeBytes);
    this.checkGarbageCollection();
  }

  /**
   * Release memory for completed operations
   */
  releaseMemory(operationId: string): void {
    this.memoryUsage.delete(operationId);
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): {
    totalUsageMB: number;
    operationCount: number;
    largestOperationMB: number;
  } {
    const totalBytes = Array.from(this.memoryUsage.values()).reduce((sum, size) => sum + size, 0);
    const largestBytes = Math.max(...Array.from(this.memoryUsage.values()), 0);

    return {
      totalUsageMB: totalBytes / (1024 * 1024),
      operationCount: this.memoryUsage.size,
      largestOperationMB: largestBytes / (1024 * 1024)
    };
  }

  private checkGarbageCollection(): void {
    const totalUsage = Array.from(this.memoryUsage.values()).reduce((sum, size) => sum + size, 0);
    
    if (totalUsage > this.gcThreshold) {
      // Trigger garbage collection hint
      if (global.gc) {
        global.gc();
      }
      console.warn(`Memory usage exceeded threshold: ${totalUsage / (1024 * 1024)}MB`);
    }
  }
}