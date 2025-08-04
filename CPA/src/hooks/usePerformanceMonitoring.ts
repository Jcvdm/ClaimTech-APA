'use client';

import { useCallback, useEffect, useRef } from 'react';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  tags?: Record<string, string>;
}

export interface RenderPerformance {
  componentName: string;
  renderTime: number;
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
}

export interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  percentage: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private renderMetrics: Map<string, RenderPerformance> = new Map();
  private maxMetrics = 1000; // Limit stored metrics to prevent memory leaks

  addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getMetrics(name?: string, limit = 100): PerformanceMetric[] {
    let filtered = name ? this.metrics.filter(m => m.name === name) : this.metrics;
    return filtered.slice(-limit);
  }

  getAverageMetric(name: string, timeWindow = 60000): number | null {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(
      m => m.name === name && (now - m.timestamp) <= timeWindow
    );
    
    if (recentMetrics.length === 0) return null;
    
    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
  }

  recordRender(componentName: string, renderTime: number) {
    const existing = this.renderMetrics.get(componentName) || {
      componentName,
      renderTime: 0,
      renderCount: 0,
      averageRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: Infinity
    };

    existing.renderCount++;
    existing.renderTime += renderTime;
    existing.averageRenderTime = existing.renderTime / existing.renderCount;
    existing.maxRenderTime = Math.max(existing.maxRenderTime, renderTime);
    existing.minRenderTime = Math.min(existing.minRenderTime, renderTime);

    this.renderMetrics.set(componentName, existing);
  }

  getRenderMetrics(): RenderPerformance[] {
    return Array.from(this.renderMetrics.values());
  }

  getMemoryUsage(): MemoryUsage | null {
    if (!('performance' in window) || !('memory' in window.performance)) {
      return null;
    }

    const memory = (window.performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }

  measureWebVitals() {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              this.addMetric({
                name: 'LCP',
                value: entry.startTime,
                timestamp: Date.now(),
                unit: 'ms',
                tags: { type: 'web-vital' }
              });
            }
          });
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Cumulative Layout Shift (CLS)
        const clsObserver = new PerformanceObserver((list) => {
          let cls = 0;
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          });

          if (cls > 0) {
            this.addMetric({
              name: 'CLS',
              value: cls,
              timestamp: Date.now(),
              unit: 'count',
              tags: { type: 'web-vital' }
            });
          }
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // First Input Delay (FID)
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'first-input') {
              this.addMetric({
                name: 'FID',
                value: (entry as any).processingStart - entry.startTime,
                timestamp: Date.now(),
                unit: 'ms',
                tags: { type: 'web-vital' }
              });
            }
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('Performance monitoring setup failed:', error);
      }
    }
  }

  clear() {
    this.metrics = [];
    this.renderMetrics.clear();
  }
}

const globalPerformanceMonitor = new PerformanceMonitor();

export function usePerformanceMonitoring(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(Date.now());

  // Measure render performance
  const startRenderMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderMeasurement = useCallback(() => {
    if (renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      globalPerformanceMonitor.recordRender(componentName, renderTime);
      
      globalPerformanceMonitor.addMetric({
        name: 'component-render-time',
        value: renderTime,
        timestamp: Date.now(),
        unit: 'ms',
        tags: { component: componentName }
      });
    }
  }, [componentName]);

  // Measure operation performance
  const measureOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;
      
      globalPerformanceMonitor.addMetric({
        name: operationName,
        value: duration,
        timestamp: Date.now(),
        unit: 'ms',
        tags: { component: componentName, status: 'success' }
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      globalPerformanceMonitor.addMetric({
        name: operationName,
        value: duration,
        timestamp: Date.now(),
        unit: 'ms',
        tags: { component: componentName, status: 'error' }
      });
      
      throw error;
    }
  }, [componentName]);

  // Measure synchronous operations
  const measureSync = useCallback(<T>(
    operationName: string,
    operation: () => T
  ): T => {
    const start = performance.now();
    try {
      const result = operation();
      const duration = performance.now() - start;
      
      globalPerformanceMonitor.addMetric({
        name: operationName,
        value: duration,
        timestamp: Date.now(),
        unit: 'ms',
        tags: { component: componentName, status: 'success' }
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      globalPerformanceMonitor.addMetric({
        name: operationName,
        value: duration,
        timestamp: Date.now(),
        unit: 'ms',
        tags: { component: componentName, status: 'error' }
      });
      
      throw error;
    }
  }, [componentName]);

  // Log slow operations
  const logSlowOperation = useCallback((
    operationName: string,
    duration: number,
    threshold = 100
  ) => {
    if (duration > threshold) {
      globalPerformanceMonitor.addMetric({
        name: 'slow-operation',
        value: duration,
        timestamp: Date.now(),
        unit: 'ms',
        tags: { 
          component: componentName, 
          operation: operationName,
          threshold: threshold.toString()
        }
      });
      
      console.warn(
        `Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms in ${componentName}`
      );
    }
  }, [componentName]);

  // Record memory usage
  const recordMemoryUsage = useCallback(() => {
    const memory = globalPerformanceMonitor.getMemoryUsage();
    if (memory) {
      globalPerformanceMonitor.addMetric({
        name: 'memory-usage',
        value: memory.percentage,
        timestamp: Date.now(),
        unit: 'percentage',
        tags: { component: componentName }
      });
    }
  }, [componentName]);

  // Monitor component lifecycle
  useEffect(() => {
    const mountDuration = Date.now() - mountTime.current;
    globalPerformanceMonitor.addMetric({
      name: 'component-mount-time',
      value: mountDuration,
      timestamp: Date.now(),
      unit: 'ms',
      tags: { component: componentName }
    });

    return () => {
      const lifetimeDuration = Date.now() - mountTime.current;
      globalPerformanceMonitor.addMetric({
        name: 'component-lifetime',
        value: lifetimeDuration,
        timestamp: Date.now(),
        unit: 'ms',
        tags: { component: componentName }
      });
    };
  }, [componentName]);

  // Setup web vitals monitoring
  useEffect(() => {
    globalPerformanceMonitor.measureWebVitals();
  }, []);

  return {
    startRenderMeasurement,
    endRenderMeasurement,
    measureOperation,
    measureSync,
    logSlowOperation,
    recordMemoryUsage,
    monitor: globalPerformanceMonitor
  };
}

// Hook for accessing performance data
export function usePerformanceData() {
  const getMetrics = useCallback((name?: string, limit = 100) => {
    return globalPerformanceMonitor.getMetrics(name, limit);
  }, []);

  const getAverageMetric = useCallback((name: string, timeWindow = 60000) => {
    return globalPerformanceMonitor.getAverageMetric(name, timeWindow);
  }, []);

  const getRenderMetrics = useCallback(() => {
    return globalPerformanceMonitor.getRenderMetrics();
  }, []);

  const getMemoryUsage = useCallback(() => {
    return globalPerformanceMonitor.getMemoryUsage();
  }, []);

  const clearMetrics = useCallback(() => {
    globalPerformanceMonitor.clear();
  }, []);

  return {
    getMetrics,
    getAverageMetric,
    getRenderMetrics,
    getMemoryUsage,
    clearMetrics
  };
}