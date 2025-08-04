'use client';

import React from 'react';
import { ErrorNotificationComponent, type ErrorNotification } from './ErrorNotification';
import { cn } from '@/lib/utils';

interface NotificationContainerProps {
  notifications: ErrorNotification[];
  onClose: (id: string) => void;
  onAction?: (id: string, actionIndex: number) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxNotifications?: number;
  className?: string;
}

export function NotificationContainer({
  notifications,
  onClose,
  onAction,
  position = 'top-right',
  maxNotifications = 5,
  className
}: NotificationContainerProps) {
  // Limit the number of visible notifications
  const visibleNotifications = notifications.slice(0, maxNotifications);
  const hiddenCount = Math.max(0, notifications.length - maxNotifications);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div 
      className={cn(
        'fixed z-50 flex flex-col space-y-2 max-w-sm w-full',
        getPositionClasses(),
        className
      )}
    >
      {visibleNotifications.map((notification) => (
        <ErrorNotificationComponent
          key={notification.id}
          notification={notification}
          onClose={onClose}
          onAction={onAction}
        />
      ))}
      
      {hiddenCount > 0 && (
        <div className="text-xs text-gray-500 text-center bg-white border rounded-lg p-2 shadow-sm">
          +{hiddenCount} more notification{hiddenCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}