'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Network, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  estimateId?: string;
  claimId?: string;
}

interface State {
  hasError: boolean;
  errorType: 'cache' | 'network' | 'unknown';
  errorMessage: string | null;
  retryCount: number;
  lastErrorTime: number;
  isRetrying: boolean;
}

export class CacheFailureBoundary extends Component<Props, State> {
  private retryTimeout?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorType: 'unknown',
      errorMessage: null,
      retryCount: 0,
      lastErrorTime: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('[CacheFailureBoundary] Cache error captured:', error);
    
    // Classify error type based on error message/stack
    let errorType: 'cache' | 'network' | 'unknown' = 'unknown';
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      errorType = 'network';
    } else if (errorMessage.includes('cache') || errorMessage.includes('query')) {
      errorType = 'cache';
    }
    
    return {
      hasError: true,
      errorType,
      errorMessage: error.message,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[CacheFailureBoundary] Cache error details:', {
      error,
      errorInfo,
      estimateId: this.props.estimateId,
      claimId: this.props.claimId,
      timestamp: new Date().toISOString()
    });

    // Attempt to clear problematic cache entries
    this.clearCacheEntries();
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  private clearCacheEntries = () => {
    try {
      // Clear TanStack Query cache entries that might be corrupted
      if (typeof window !== 'undefined' && (window as any).__REACT_QUERY_CLIENT__) {
        const queryClient = (window as any).__REACT_QUERY_CLIENT__;
        
        // Clear estimate-related queries
        if (this.props.estimateId) {
          queryClient.removeQueries({ 
            queryKey: ['estimate', 'lines', this.props.estimateId] 
          });
          queryClient.removeQueries({ 
            queryKey: ['estimate', 'getById', this.props.estimateId] 
          });
        }
        
        if (this.props.claimId) {
          queryClient.removeQueries({ 
            queryKey: ['estimate', 'getByClaimId', this.props.claimId] 
          });
        }
        
        console.log('[CacheFailureBoundary] Cache entries cleared');
      }
    } catch (error) {
      console.error('[CacheFailureBoundary] Failed to clear cache entries:', error);
    }
  };

  private handleRetry = async () => {
    console.log('[CacheFailureBoundary] Attempting cache recovery...');
    
    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    try {
      // Clear cache and wait a moment
      this.clearCacheEntries();
      
      // Add delay to let cache clear
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reset error state
      this.setState({
        hasError: false,
        errorMessage: null,
        isRetrying: false
      });
      
      toast.success('Cache recovered successfully');
      
    } catch (error) {
      console.error('[CacheFailureBoundary] Retry failed:', error);
      this.setState({ isRetrying: false });
      toast.error('Cache recovery failed');
    }
  };

  private handleAutoRetry = () => {
    // Implement exponential backoff for auto-retry
    const backoffDelay = Math.min(1000 * Math.pow(2, this.state.retryCount), 30000);
    
    console.log(`[CacheFailureBoundary] Auto-retry in ${backoffDelay}ms`);
    
    this.retryTimeout = setTimeout(() => {
      this.handleRetry();
    }, backoffDelay);
  };

  private handleForceRefresh = () => {
    if (confirm('This will refresh the page. Any unsaved changes will be lost. Continue?')) {
      // Try to preserve session data before refresh
      if (this.props.estimateId) {
        const sessionData = this.getSessionData();
        if (sessionData) {
          localStorage.setItem(
            `cache-failure-backup-${this.props.estimateId}`,
            JSON.stringify({
              ...sessionData,
              timestamp: Date.now(),
              reason: 'cache-failure-refresh'
            })
          );
        }
      }
      
      window.location.reload();
    }
  };

  private getSessionData = () => {
    try {
      // Try to get current session data to preserve before refresh
      if (typeof window !== 'undefined') {
        const estimateStore = (window as any).__ZUSTAND_STORES__?.find((store: any) => 
          store.currentEstimateId === this.props.estimateId
        );
        
        if (estimateStore) {
          const state = estimateStore.getState();
          return {
            displayLines: state.displayLines,
            pendingChanges: state.pendingChanges,
            hasUnsavedChanges: state.hasUnsavedChanges
          };
        }
      }
    } catch (error) {
      console.error('[CacheFailureBoundary] Could not preserve session data:', error);
    }
    return null;
  };

  private getErrorIcon = () => {
    switch (this.state.errorType) {
      case 'network':
        return <Network className="h-5 w-5" />;
      case 'cache':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  private getErrorTitle = () => {
    switch (this.state.errorType) {
      case 'network':
        return 'Network Connection Error';
      case 'cache':
        return 'Data Cache Error';
      default:
        return 'Application Error';
    }
  };

  private getErrorDescription = () => {
    switch (this.state.errorType) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      case 'cache':
        return 'There was an issue loading data from cache. This usually resolves automatically.';
      default:
        return 'An unexpected error occurred while loading estimate data.';
    }
  };

  render() {
    if (this.state.hasError) {
      const timeSinceError = Date.now() - this.state.lastErrorTime;
      const minutesAgo = Math.floor(timeSinceError / 1000 / 60);
      
      return (
        <Card className="mx-auto max-w-xl mt-4 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              {this.getErrorIcon()}
              {this.getErrorTitle()}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-sm text-orange-700">
              <p className="mb-2">{this.getErrorDescription()}</p>
              
              {this.state.errorMessage && (
                <details className="mb-3">
                  <summary className="cursor-pointer font-medium hover:underline text-xs">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-24">
                    {this.state.errorMessage}
                  </pre>
                </details>
              )}
              
              <div className="flex items-center gap-1 text-xs text-orange-600 mb-3">
                <Clock className="h-3 w-3" />
                <span>
                  Error occurred {minutesAgo > 0 ? `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago` : 'just now'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={this.handleRetry}
                disabled={this.state.isRetrying}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
                {this.state.isRetrying ? 'Retrying...' : 'Retry'}
                {this.state.retryCount > 0 && ` (${this.state.retryCount + 1})`}
              </Button>
              
              {this.state.retryCount < 3 && !this.state.isRetrying && (
                <Button 
                  onClick={this.handleAutoRetry}
                  variant="outline"
                  size="sm"
                >
                  Auto-retry
                </Button>
              )}
              
              <Button 
                onClick={this.handleForceRefresh}
                variant="outline"
                size="sm"
              >
                Refresh Page
              </Button>
            </div>
            
            {this.state.retryCount >= 3 && (
              <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                <p className="font-medium">Multiple retry attempts failed</p>
                <p>If this continues, please refresh the page or contact support.</p>
              </div>
            )}
            
            <div className="text-xs text-gray-600 border-t pt-2">
              <p>Error Type: {this.state.errorType}</p>
              {this.props.estimateId && <p>Estimate: {this.props.estimateId}</p>}
              {this.props.claimId && <p>Claim: {this.props.claimId}</p>}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}