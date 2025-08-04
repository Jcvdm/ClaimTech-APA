'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  X, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'error' | 'warning' | 'info' | 'success';

export interface ErrorNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  autoCloseDelay?: number;
  actions?: {
    label: string;
    action: () => void;
    variant?: 'default' | 'outline' | 'destructive';
  }[];
}

interface ErrorNotificationProps {
  notification: ErrorNotification;
  onClose: (id: string) => void;
  onAction?: (id: string, actionIndex: number) => void;
}

export function ErrorNotificationComponent({
  notification,
  onClose,
  onAction
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (notification.autoClose && notification.autoCloseDelay) {
      setTimeLeft(notification.autoCloseDelay);
      
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1000) {
            clearInterval(interval);
            handleClose();
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [notification.autoClose, notification.autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(notification.id), 150);
  };

  const handleAction = (actionIndex: number) => {
    notification.actions?.[actionIndex]?.action();
    onAction?.(notification.id, actionIndex);
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (notification.type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      case 'success':
        return 'default';
    }
  };

  const getBorderColor = () => {
    switch (notification.type) {
      case 'error':
        return 'border-red-300';
      case 'warning':
        return 'border-yellow-300';
      case 'info':
        return 'border-blue-300';
      case 'success':
        return 'border-green-300';
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'info':
        return 'bg-blue-50';
      case 'success':
        return 'bg-green-50';
    }
  };

  if (!isVisible) return null;

  return (
    <Alert 
      variant={getVariant()}
      className={cn(
        'relative transition-all duration-300 ease-in-out',
        getBorderColor(),
        getBackgroundColor(),
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      )}
    >
      {getIcon()}
      
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <AlertTitle className="flex items-center space-x-2">
              <span>{notification.title}</span>
              <Badge variant="outline" className="text-xs">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </Badge>
            </AlertTitle>
            <AlertDescription className="mt-1">
              {notification.message}
            </AlertDescription>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-6 w-6 p-0 hover:bg-black/10"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Actions */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="mt-3 flex space-x-2">
            {notification.actions.map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant={action.variant || 'outline'}
                onClick={() => handleAction(index)}
                className="text-xs"
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Auto-close timer */}
        {timeLeft !== null && timeLeft > 0 && (
          <div className="mt-2 flex items-center space-x-2 text-xs text-gray-600">
            <Clock className="h-3 w-3" />
            <span>Auto-closing in {Math.ceil(timeLeft / 1000)}s</span>
          </div>
        )}
      </div>
    </Alert>
  );
}

// Hook for managing notifications
export function useErrorNotifications() {
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

  const addNotification = (notification: Omit<ErrorNotification, 'id' | 'timestamp'>) => {
    const newNotification: ErrorNotification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, newNotification]);
    return newNotification.id;
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Convenience methods
  const addError = (title: string, message: string, actions?: ErrorNotification['actions']) => {
    return addNotification({ type: 'error', title, message, actions });
  };

  const addWarning = (title: string, message: string, actions?: ErrorNotification['actions']) => {
    return addNotification({ 
      type: 'warning', 
      title, 
      message, 
      actions,
      autoClose: true,
      autoCloseDelay: 8000
    });
  };

  const addInfo = (title: string, message: string, actions?: ErrorNotification['actions']) => {
    return addNotification({ 
      type: 'info', 
      title, 
      message, 
      actions,
      autoClose: true,
      autoCloseDelay: 5000
    });
  };

  const addSuccess = (title: string, message: string, actions?: ErrorNotification['actions']) => {
    return addNotification({ 
      type: 'success', 
      title, 
      message, 
      actions,
      autoClose: true,
      autoCloseDelay: 3000
    });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    addError,
    addWarning,
    addInfo,
    addSuccess
  };
}