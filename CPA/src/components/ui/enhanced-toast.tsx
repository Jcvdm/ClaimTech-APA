'use client';

import { toast, ToastT } from 'sonner';
import { AlertTriangle, CheckCircle, Info, XCircle, RefreshCw, HelpCircle } from 'lucide-react';

export interface EnhancedToastAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline';
  loading?: boolean;
}

export interface EnhancedToastOptions {
  title?: string;
  description?: string;
  actions?: EnhancedToastAction[];
  persistent?: boolean;
  showIcon?: boolean;
  onDismiss?: () => void;
  metadata?: Record<string, any>;
}

export interface RecoveryOptions {
  retryAction?: () => Promise<boolean>;
  fallbackAction?: () => void;
  helpAction?: () => void;
  reportAction?: () => void;
  showTechnicalDetails?: boolean;
  technicalDetails?: string;
}

class EnhancedToastManager {
  private activeToasts = new Map<string, string>();

  // Show success toast with optional actions
  success(message: string, options: EnhancedToastOptions = {}) {
    const toastId = toast.success(message, {
      description: options.description,
      duration: options.persistent ? 0 : 4000,
      action: options.actions?.length ? {
        label: options.actions[0].label,
        onClick: options.actions[0].onClick,
      } : undefined,
      onDismiss: options.onDismiss,
      icon: options.showIcon !== false ? <CheckCircle className="h-4 w-4" /> : undefined,
    });

    if (options.persistent) {
      this.activeToasts.set(message, toastId);
    }

    return toastId;
  }

  // Show error toast with recovery options
  error(message: string, options: EnhancedToastOptions & RecoveryOptions = {}) {
    const actions = this.buildErrorActions(options);
    
    const toastId = toast.error(message, {
      description: options.description,
      duration: options.persistent ? 0 : 8000,
      action: actions.length > 0 ? {
        label: actions[0].label,
        onClick: actions[0].onClick,
      } : undefined,
      cancel: actions.length > 1 ? {
        label: actions[1].label,
        onClick: actions[1].onClick,
      } : undefined,
      onDismiss: options.onDismiss,
      icon: options.showIcon !== false ? <XCircle className="h-4 w-4" /> : undefined,
    });

    if (options.persistent) {
      this.activeToasts.set(message, toastId);
    }

    return toastId;
  }

  // Show warning toast
  warning(message: string, options: EnhancedToastOptions = {}) {
    const toastId = toast.warning(message, {
      description: options.description,
      duration: options.persistent ? 0 : 6000,
      action: options.actions?.length ? {
        label: options.actions[0].label,
        onClick: options.actions[0].onClick,
      } : undefined,
      onDismiss: options.onDismiss,
      icon: options.showIcon !== false ? <AlertTriangle className="h-4 w-4" /> : undefined,
    });

    if (options.persistent) {
      this.activeToasts.set(message, toastId);
    }

    return toastId;
  }

  // Show info toast
  info(message: string, options: EnhancedToastOptions = {}) {
    const toastId = toast.info(message, {
      description: options.description,
      duration: options.persistent ? 0 : 5000,
      action: options.actions?.length ? {
        label: options.actions[0].label,
        onClick: options.actions[0].onClick,
      } : undefined,
      onDismiss: options.onDismiss,
      icon: options.showIcon !== false ? <Info className="h-4 w-4" /> : undefined,
    });

    if (options.persistent) {
      this.activeToasts.set(message, toastId);
    }

    return toastId;
  }

  // Show loading toast with progress
  loading(message: string, options: EnhancedToastOptions = {}) {
    const toastId = toast.loading(message, {
      description: options.description,
      duration: 0, // Loading toasts should be persistent by default
      onDismiss: options.onDismiss,
    });

    this.activeToasts.set(message, toastId);
    return toastId;
  }

  // Update an existing toast
  update(toastId: string, message: string, options: EnhancedToastOptions = {}) {
    // Note: Sonner doesn't have a direct update method, so we dismiss and create new
    toast.dismiss(toastId);
    return this.info(message, options);
  }

  // Dismiss a specific toast
  dismiss(messageOrId: string) {
    const toastId = this.activeToasts.get(messageOrId) || messageOrId;
    toast.dismiss(toastId);
    this.activeToasts.delete(messageOrId);
  }

  // Dismiss all toasts
  dismissAll() {
    toast.dismiss();
    this.activeToasts.clear();
  }

  // Show validation error with field-specific help
  validationError(message: string, options: {
    field?: string;
    value?: any;
    expectedFormat?: string;
    helpText?: string;
    onFix?: () => void;
  } = {}) {
    const description = options.field 
      ? `Field: ${options.field}${options.expectedFormat ? ` (Expected: ${options.expectedFormat})` : ''}`
      : options.helpText;

    return this.error(message, {
      description,
      actions: options.onFix ? [{
        label: 'Fix',
        onClick: options.onFix,
      }] : undefined,
      helpAction: options.helpText ? () => {
        this.info('Validation Help', {
          description: options.helpText,
          persistent: true,
        });
      } : undefined,
    });
  }

  // Show network error with retry options
  networkError(message: string, options: {
    onRetry?: () => Promise<boolean>;
    onOfflineMode?: () => void;
    showConnectionStatus?: boolean;
  } = {}) {
    const actions: EnhancedToastAction[] = [];

    if (options.onRetry) {
      actions.push({
        label: 'Retry',
        onClick: async () => {
          const retryToast = this.loading('Retrying...', {
            description: 'Attempting to reconnect...',
          });

          try {
            const success = await options.onRetry!();
            this.dismiss(retryToast);
            
            if (success) {
              this.success('Connection restored');
            } else {
              this.error('Retry failed', {
                description: 'The connection could not be restored.',
              });
            }
          } catch (error) {
            this.dismiss(retryToast);
            this.error('Retry error', {
              description: 'An error occurred while retrying.',
            });
          }
        },
      });
    }

    if (options.onOfflineMode) {
      actions.push({
        label: 'Work Offline',
        onClick: options.onOfflineMode,
      });
    }

    return this.error(message, {
      description: 'Check your internet connection and try again.',
      actions,
      persistent: true,
    });
  }

  // Show permission error with escalation options
  permissionError(message: string, options: {
    requiredPermission?: string;
    onRequestAccess?: () => void;
    onContactAdmin?: () => void;
  } = {}) {
    const actions: EnhancedToastAction[] = [];

    if (options.onRequestAccess) {
      actions.push({
        label: 'Request Access',
        onClick: options.onRequestAccess,
      });
    }

    if (options.onContactAdmin) {
      actions.push({
        label: 'Contact Admin',
        onClick: options.onContactAdmin,
      });
    }

    const description = options.requiredPermission 
      ? `Required permission: ${options.requiredPermission}`
      : 'You do not have sufficient permissions for this action.';

    return this.error(message, {
      description,
      actions,
      persistent: true,
    });
  }

  // Show conflict resolution toast
  conflictResolution(message: string, options: {
    onUseServer?: () => void;
    onUseLocal?: () => void;
    onViewDiff?: () => void;
    serverVersion?: string;
    localVersion?: string;
  } = {}) {
    const actions: EnhancedToastAction[] = [];

    if (options.onUseServer) {
      actions.push({
        label: `Use Server${options.serverVersion ? ` (${options.serverVersion})` : ''}`,
        onClick: options.onUseServer,
      });
    }

    if (options.onUseLocal) {
      actions.push({
        label: `Keep Local${options.localVersion ? ` (${options.localVersion})` : ''}`,
        onClick: options.onUseLocal,
      });
    }

    if (options.onViewDiff) {
      actions.push({
        label: 'View Changes',
        onClick: options.onViewDiff,
      });
    }

    return this.warning(message, {
      description: 'Choose which version to keep or review the differences.',
      actions,
      persistent: true,
    });
  }

  private buildErrorActions(options: RecoveryOptions): EnhancedToastAction[] {
    const actions: EnhancedToastAction[] = [];

    // Add retry action if provided
    if (options.retryAction) {
      actions.push({
        label: 'Retry',
        onClick: async () => {
          try {
            const success = await options.retryAction!();
            if (success) {
              this.success('Operation completed successfully');
            }
          } catch (error) {
            console.error('Retry action error:', error);
          }
        },
      });
    }

    // Add fallback action if provided
    if (options.fallbackAction) {
      actions.push({
        label: 'Alternative',
        onClick: options.fallbackAction,
        variant: 'outline',
      });
    }

    // Add help action if provided
    if (options.helpAction) {
      actions.push({
        label: 'Help',
        onClick: options.helpAction,
        variant: 'outline',
      });
    }

    // Add technical details action if available
    if (options.showTechnicalDetails && options.technicalDetails) {
      actions.push({
        label: 'Details',
        onClick: () => {
          this.info('Technical Details', {
            description: options.technicalDetails,
            persistent: true,
          });
        },
        variant: 'outline',
      });
    }

    // Add report action if provided
    if (options.reportAction) {
      actions.push({
        label: 'Report Issue',
        onClick: options.reportAction,
        variant: 'outline',
      });
    }

    return actions;
  }
}

// Export singleton instance
export const enhancedToast = new EnhancedToastManager();

// Export individual methods for convenience
export const {
  success: toastSuccess,
  error: toastError,
  warning: toastWarning,
  info: toastInfo,
  loading: toastLoading,
  validationError: toastValidationError,
  networkError: toastNetworkError,
  permissionError: toastPermissionError,
  conflictResolution: toastConflictResolution,
} = enhancedToast;