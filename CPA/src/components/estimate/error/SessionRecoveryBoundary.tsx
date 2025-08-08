'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Download, Trash, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  estimateId: string;
  claimId: string;
}

interface State {
  hasError: boolean;
  errorInfo: string | null;
  retryCount: number;
  lastBackupTime: number | null;
  backupData: any | null;
}

interface SessionBackupData {
  estimateId: string;
  displayLines: any[];
  pendingChanges: string[];
  syncQueue: any[];
  timestamp: number;
  version: string;
}

export class SessionRecoveryBoundary extends Component<Props, State> {
  private backupKey: string;
  private backupInterval?: NodeJS.Timeout;
  private isMounted = false;

  constructor(props: Props) {
    super(props);
    this.backupKey = `estimate-session-recovery-${props.estimateId}`;
    
    this.state = {
      hasError: false,
      errorInfo: null,
      retryCount: 0,
      lastBackupTime: null,
      backupData: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('[SessionRecoveryBoundary] Component error captured:', error);
    return {
      hasError: true,
      errorInfo: error.message
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[SessionRecoveryBoundary] Session error details:', {
      error,
      errorInfo,
      estimateId: this.props.estimateId,
      claimId: this.props.claimId
    });
    
    // Attempt immediate backup of any existing session data
    this.performEmergencyBackup();
    
    // Check for existing backup data
    this.checkForExistingBackup();
  }

  componentDidMount() {
    this.isMounted = true;
    // Set up automatic backup monitoring
    this.setupBackupMonitoring();
  }

  componentWillUnmount() {
    this.isMounted = false;
    // Clean up backup monitoring
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    
    // Clear interval safely
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = undefined;
    }
    
    console.log('[SessionRecoveryBoundary] Component unmounted, cleanup completed');
  }

  private setupBackupMonitoring = () => {
    if (typeof window === 'undefined' || !this.isMounted) return;

    // Monitor for page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    
    // Periodic backup check (every 30 seconds) with mount check
    this.backupInterval = setInterval(() => {
      if (this.isMounted) {
        this.checkForSessionData();
      } else {
        // Component was unmounted, clear interval
        if (this.backupInterval) {
          clearInterval(this.backupInterval);
          this.backupInterval = undefined;
        }
      }
    }, 30000);
  };

  private handleBeforeUnload = (e: BeforeUnloadEvent) => {
    this.performEmergencyBackup();
  };

  private performEmergencyBackup = () => {
    // Check if component is still mounted before performing backup
    if (!this.isMounted) {
      console.log('[SessionRecoveryBoundary] Skipping backup - component unmounted');
      return;
    }
    
    try {
      // Try to capture current session state from store
      const sessionStoreState = this.getSessionStoreState();
      if (sessionStoreState) {
        const backupData: SessionBackupData = {
          estimateId: this.props.estimateId,
          displayLines: sessionStoreState.displayLines || [],
          pendingChanges: sessionStoreState.pendingChanges || [],
          syncQueue: sessionStoreState.syncQueue || [],
          timestamp: Date.now(),
          version: '1.0'
        };

        localStorage.setItem(this.backupKey, JSON.stringify(backupData));
        console.log('[SessionRecoveryBoundary] Emergency backup completed');
        
        // Only update state if component is still mounted
        if (this.isMounted) {
          this.setState({ lastBackupTime: Date.now() });
        }
      }
    } catch (error) {
      console.error('[SessionRecoveryBoundary] Emergency backup failed:', error);
    }
  };

  private getSessionStoreState = () => {
    try {
      // Access the Zustand store directly
      if (typeof window !== 'undefined') {
        // Import the store dynamically to avoid SSR issues
        const storeModule = require('@/stores/estimateSessionStore');
        if (storeModule && storeModule.useEstimateSessionStore) {
          const store = storeModule.useEstimateSessionStore;
          const state = store.getState();
          
          // Only return state if it's for the current estimate
          if (state.currentEstimateId === this.props.estimateId) {
            return state;
          }
        }
      }
      
      // Fallback: try to get from localStorage backup
      const storedBackup = localStorage.getItem(`estimate-session-backup-${this.props.estimateId}`);
      return storedBackup ? JSON.parse(storedBackup) : null;
    } catch (error) {
      console.error('[SessionRecoveryBoundary] Could not access session state:', error);
      return null;
    }
  };

  private checkForExistingBackup = () => {
    try {
      // Check both the recovery backup and the session backup
      const backupKeys = [
        this.backupKey,
        `estimate-session-backup-${this.props.estimateId}`
      ];
      
      for (const key of backupKeys) {
        const backup = localStorage.getItem(key);
        if (backup) {
          const backupData: SessionBackupData = JSON.parse(backup);
          
          // Validate backup age (only use if less than 1 hour old)
          const backupAge = Date.now() - backupData.timestamp;
          const maxAge = 60 * 60 * 1000; // 1 hour
          
          if (backupAge < maxAge && backupData.estimateId === this.props.estimateId) {
            this.setState({ backupData, lastBackupTime: backupData.timestamp });
            console.log('[SessionRecoveryBoundary] Valid backup found:', backupData);
            return; // Use the first valid backup found
          } else {
            // Clean up stale backup
            localStorage.removeItem(key);
            console.log('[SessionRecoveryBoundary] Stale backup removed:', key);
          }
        }
      }
    } catch (error) {
      console.error('[SessionRecoveryBoundary] Error checking backup:', error);
    }
  };

  private checkForSessionData = () => {
    // Check if component is still mounted before checking session data
    if (!this.isMounted) {
      console.log('[SessionRecoveryBoundary] Skipping session data check - component unmounted');
      return;
    }
    
    const sessionState = this.getSessionStoreState();
    if (sessionState && !this.state.hasError && this.isMounted) {
      // Create backup if session has unsaved changes
      if (sessionState.hasUnsavedChanges) {
        this.performEmergencyBackup();
      }
    }
  };

  private handleRetry = () => {
    if (!this.isMounted) {
      console.log('[SessionRecoveryBoundary] Skipping retry - component unmounted');
      return;
    }
    
    console.log('[SessionRecoveryBoundary] Attempting error recovery...');
    
    this.setState(prevState => ({
      hasError: false,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));

    // Force a small delay to ensure component re-mounts cleanly
    setTimeout(() => {
      // Only show toast if component is still mounted
      if (this.isMounted) {
        toast.success('Session recovered successfully');
      }
    }, 100);
  };

  private handleRestoreFromBackup = () => {
    if (!this.state.backupData) {
      toast.error('No backup data available');
      return;
    }

    try {
      console.log('[SessionRecoveryBoundary] Restoring from backup:', this.state.backupData);
      
      // Restore to session store directly
      const backupData = this.state.backupData as SessionBackupData;
      
      // Access the store and restore data
      if (typeof window !== 'undefined') {
        const storeModule = require('@/stores/estimateSessionStore');
        if (storeModule && storeModule.useEstimateSessionStore) {
          const store = storeModule.useEstimateSessionStore;
          
          // Restore session data
          if (Array.isArray(backupData.displayLines)) {
            const displayLinesMap = new Map(backupData.displayLines);
            const pendingChangesSet = new Set(backupData.pendingChanges || []);
            const syncQueueMap = new Map(backupData.syncQueue || []);
            
            // Use setState to restore the session
            store.setState({
              currentEstimateId: this.props.estimateId,
              displayLines: displayLinesMap,
              pendingChanges: pendingChangesSet,
              syncQueue: syncQueueMap,
              lastActivityTime: Date.now()
            });
            
            console.log('[SessionRecoveryBoundary] Session data restored to store');
          }
        }
      }
      
      // Clear error state and attempt retry
      this.setState({
        hasError: false,
        errorInfo: null,
        backupData: null
      });
      
      const lineCount = Array.isArray(backupData.displayLines) ? backupData.displayLines.length : 0;
      toast.success(`Session restored from backup (${lineCount} lines)`);
    } catch (error) {
      console.error('[SessionRecoveryBoundary] Restoration failed:', error);
      toast.error('Failed to restore session from backup');
    }
  };

  private handleClearBackup = () => {
    try {
      localStorage.removeItem(this.backupKey);
      this.setState({ 
        backupData: null,
        lastBackupTime: null 
      });
      toast.success('Backup data cleared');
    } catch (error) {
      console.error('[SessionRecoveryBoundary] Error clearing backup:', error);
    }
  };

  private handleForceReload = () => {
    if (confirm('This will refresh the page and lose any unsaved changes. Continue?')) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const hasBackup = !!this.state.backupData;
      const backupAge = this.state.lastBackupTime 
        ? Math.floor((Date.now() - this.state.lastBackupTime) / 1000 / 60) 
        : null;

      return (
        <Card className="mx-auto max-w-2xl mt-8 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              Estimate Session Error
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-sm text-red-700">
              <p className="mb-2">
                An error occurred while editing the estimate. Your data may have been preserved automatically.
              </p>
              
              {this.state.errorInfo && (
                <details className="mb-4">
                  <summary className="cursor-pointer font-medium hover:underline">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                    {this.state.errorInfo}
                  </pre>
                </details>
              )}
              
              {hasBackup && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Download className="h-4 w-4" />
                    <span className="font-medium">Backup Available</span>
                  </div>
                  <div className="text-sm text-blue-700">
                    <p>Session backup found with {this.state.backupData?.displayLines?.length || 0} estimate lines</p>
                    {backupAge !== null && (
                      <p className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        Created {backupAge} minute{backupAge !== 1 ? 's' : ''} ago
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={this.handleRetry} 
                variant="default"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again {this.state.retryCount > 0 && `(${this.state.retryCount + 1})`}
              </Button>
              
              {hasBackup && (
                <Button 
                  onClick={this.handleRestoreFromBackup} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Restore Backup
                </Button>
              )}
              
              <Button 
                onClick={this.handleForceReload} 
                variant="outline"
              >
                Refresh Page
              </Button>
              
              {hasBackup && (
                <Button 
                  onClick={this.handleClearBackup} 
                  variant="ghost" 
                  size="sm"
                  className="text-gray-600"
                >
                  <Trash className="h-3 w-3 mr-1" />
                  Clear Backup
                </Button>
              )}
            </div>
            
            <div className="text-xs text-gray-600 border-t pt-3">
              <p>If this error persists, contact support with the technical details above.</p>
              <p>Estimate ID: {this.props.estimateId} • Claim ID: {this.props.claimId}</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}