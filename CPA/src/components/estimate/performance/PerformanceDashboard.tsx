'use client';

import React, { useState, useEffect } from 'react';
import { usePerformanceData, type PerformanceMetric, type RenderPerformance, type MemoryUsage } from '@/hooks/usePerformanceMonitoring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Clock, 
  MemoryStick, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface PerformanceDashboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function PerformanceDashboard({ 
  autoRefresh = true, 
  refreshInterval = 5000 
}: PerformanceDashboardProps) {
  const { getMetrics, getAverageMetric, getRenderMetrics, getMemoryUsage, clearMetrics } = usePerformanceData();
  
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [renderMetrics, setRenderMetrics] = useState<RenderPerformance[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<MemoryUsage | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const refreshData = () => {
    setMetrics(getMetrics());
    setRenderMetrics(getRenderMetrics());
    setMemoryUsage(getMemoryUsage());
    setLastUpdate(new Date());
  };

  useEffect(() => {
    refreshData();
    
    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Calculate performance insights
  const avgRenderTime = getAverageMetric('component-render-time') || 0;
  const slowOperations = metrics.filter(m => 
    m.name === 'slow-operation' && (Date.now() - m.timestamp) < 300000 // Last 5 minutes
  );
  const webVitals = {
    lcp: metrics.filter(m => m.name === 'LCP').slice(-1)[0]?.value || 0,
    fid: metrics.filter(m => m.name === 'FID').slice(-1)[0]?.value || 0,
    cls: metrics.filter(m => m.name === 'CLS').slice(-1)[0]?.value || 0
  };

  const getPerformanceScore = () => {
    let score = 100;
    
    // Deduct for slow render times
    if (avgRenderTime > 16) score -= 20; // Slower than 60fps
    if (avgRenderTime > 33) score -= 20; // Slower than 30fps
    
    // Deduct for poor web vitals
    if (webVitals.lcp > 2500) score -= 15;
    if (webVitals.fid > 100) score -= 15;
    if (webVitals.cls > 0.1) score -= 15;
    
    // Deduct for memory usage
    if (memoryUsage && memoryUsage.percentage > 80) score -= 15;
    
    return Math.max(0, score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const performanceScore = getPerformanceScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-sm text-gray-600">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={clearMetrics} variant="outline" size="sm">
            Clear Data
          </Button>
        </div>
      </div>

      {/* Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Overall Performance Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className={`text-4xl font-bold ${getScoreColor(performanceScore)}`}>
              {performanceScore}
            </div>
            <div className="flex-1">
              <Progress value={performanceScore} className="h-3" />
              <div className="text-sm text-gray-600 mt-1">
                {performanceScore >= 90 ? 'Excellent' : 
                 performanceScore >= 70 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Render Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Avg Render Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRenderTime.toFixed(1)}ms
            </div>
            <div className="flex items-center mt-2">
              {avgRenderTime <= 16 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm ${avgRenderTime <= 16 ? 'text-green-600' : 'text-red-600'}`}>
                {avgRenderTime <= 16 ? 'Good' : 'Slow'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <MemoryStick className="h-4 w-4" />
              <span>Memory Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {memoryUsage ? (
              <>
                <div className="text-2xl font-bold">
                  {memoryUsage.percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatBytes(memoryUsage.usedJSHeapSize)} / {formatBytes(memoryUsage.jsHeapSizeLimit)}
                </div>
                <Progress value={memoryUsage.percentage} className="h-2 mt-2" />
              </>
            ) : (
              <div className="text-gray-500">Not available</div>
            )}
          </CardContent>
        </Card>

        {/* Web Vitals - LCP */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>LCP</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {webVitals.lcp > 0 ? `${webVitals.lcp.toFixed(0)}ms` : 'N/A'}
            </div>
            <Badge 
              variant={webVitals.lcp <= 2500 ? "default" : "destructive"}
              className="mt-2"
            >
              {webVitals.lcp <= 2500 ? 'Good' : 'Poor'}
            </Badge>
          </CardContent>
        </Card>

        {/* Slow Operations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Slow Operations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {slowOperations.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Last 5 minutes
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Component Render Metrics */}
      {renderMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Component Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {renderMetrics
                .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
                .slice(0, 10)
                .map((metric) => (
                  <div key={metric.componentName} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{metric.componentName}</div>
                      <div className="text-sm text-gray-600">
                        {metric.renderCount} renders
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {metric.averageRenderTime.toFixed(1)}ms avg
                      </div>
                      <div className="text-sm text-gray-600">
                        {metric.maxRenderTime.toFixed(1)}ms max
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Slow Operations */}
      {slowOperations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Recent Slow Operations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {slowOperations.slice(-10).map((operation, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                  <div>
                    <div className="font-medium">{operation.tags?.operation || 'Unknown'}</div>
                    <div className="text-sm text-gray-600">
                      {operation.tags?.component || 'Unknown component'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-yellow-600">
                      {operation.value.toFixed(1)}ms
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(operation.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}