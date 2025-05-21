'use client';

import { useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useSyncStatusStore, SyncStatus } from '@/stores/syncStatusStore';

/**
 * A global indicator that shows the current synchronization status
 * Displays in the top-right corner of the page
 */
export function SyncStatusIndicator() {
  const { status, message } = useSyncStatusStore();
  
  // Don't render anything if idle and no message
  if (status === 'idle' && !message) {
    return null;
  }
  
  // Define status-specific properties
  const getStatusProps = (status: SyncStatus) => {
    switch (status) {
      case 'syncing':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        };
      default:
        return {
          icon: null,
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-200'
        };
    }
  };
  
  const { icon, bgColor, textColor, borderColor } = getStatusProps(status);
  
  return (
    <div 
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-md border ${bgColor} ${textColor} ${borderColor} shadow-sm transition-all duration-300 ease-in-out`}
      role="status"
      aria-live="polite"
    >
      {icon}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
