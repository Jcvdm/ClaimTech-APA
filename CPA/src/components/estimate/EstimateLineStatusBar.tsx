'use client';

import React from 'react';
import { type UseEstimateSessionReturn } from '@/hooks/useEstimateSession';
import { useEstimateLineContext } from './EstimateLineContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  Check, 
  AlertTriangle, 
  X, 
  RefreshCw,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';

interface EstimateLineStatusBarProps {
  session: UseEstimateSessionReturn;
}

export function EstimateLineStatusBar({ session }: EstimateLineStatusBarProps) {
  const { lines, selectedRows } = useEstimateLineContext();

  const pendingCount = session.pendingChangesCount;
  const conflictCount = session.conflictCount;
  const isOnline = navigator.onLine;
  const totalLines = lines.length;
  const selectedCount = selectedRows.size;

  // Calculate save progress if available
  const saveProgress = session.syncStatus === 'syncing' ? 50 : 0; // Simplified progress for now

  const getStatusColor = () => {
    if (conflictCount > 0) return 'text-red-600';
    if (pendingCount > 0) return 'text-orange-600';
    if (session.syncStatus === 'syncing') return 'text-blue-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (conflictCount > 0) return <AlertTriangle className="h-4 w-4" />;
    if (session.syncStatus === 'syncing') return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (pendingCount > 0) return <Clock className="h-4 w-4" />;
    return <Check className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (conflictCount > 0) return `${conflictCount} conflict${conflictCount > 1 ? 's' : ''} need resolution`;
    if (session.syncStatus === 'syncing') return 'Saving changes...';
    if (pendingCount > 0) return `${pendingCount} unsaved change${pendingCount > 1 ? 's' : ''}`;
    if (!isOnline) return 'Offline - changes will sync when connected';
    return 'All changes saved';
  };

  const handleRetryFailed = () => {
    session.syncNow();
  };

  const handleResolveConflicts = () => {
    session.discardChanges();
  };

  return (
    <div className="border-t bg-gray-50 px-4 py-2">
      <div className="flex items-center justify-between">
        {/* Left side - Status and actions */}
        <div className="flex items-center space-x-4">
          {/* Main status */}
          <div className={`flex items-center space-x-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>

          {/* Progress bar for saving */}
          {session.syncStatus === 'syncing' && saveProgress > 0 && (
            <div className="flex items-center space-x-2">
              <Progress value={saveProgress} className="w-24 h-2" />
              <span className="text-xs text-gray-500">{Math.round(saveProgress)}%</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center space-x-1">
            {conflictCount > 0 && (
              <Button
                onClick={handleResolveConflicts}
                size="sm"
                variant="outline"
                className="flex items-center space-x-1 text-red-600 border-red-200"
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Resolve</span>
              </Button>
            )}

            {session.syncStatus === 'error' && (
              <Button
                onClick={handleRetryFailed}
                size="sm"
                variant="outline"
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Retry</span>
              </Button>
            )}
          </div>
        </div>

        {/* Right side - Stats and connection status */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          {/* Selection info */}
          {selectedCount > 0 && (
            <Badge variant="outline">
              {selectedCount} of {totalLines} selected
            </Badge>
          )}

          {/* Line count */}
          <div className="flex items-center space-x-1">
            <Database className="h-3 w-3" />
            <span>{totalLines} lines</span>
          </div>

          {/* Connection status */}
          <div className={`flex items-center space-x-1 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span className="text-xs">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Auto-save status */}
          <div className="flex items-center space-x-1 text-green-600">
            <Clock className="h-3 w-3" />
            <span className="text-xs">Auto-save</span>
          </div>
        </div>
      </div>

      {/* Expanded error details if needed */}
      {(conflictCount > 0 || session.syncStatus === 'error') && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
          {conflictCount > 0 && (
            <div className="text-red-800 mb-1">
              <strong>Conflicts detected:</strong> Some changes conflict with recent updates. 
              Review and resolve conflicts to continue.
            </div>
          )}
          
          {session.syncStatus === 'error' && (
            <div className="text-red-800">
              <strong>Failed operations:</strong> Sync operation failed. 
              Check your connection and retry.
            </div>
          )}
        </div>
      )}
    </div>
  );
}