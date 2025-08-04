'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ValidationLevel = 'error' | 'warning' | 'info' | 'success';

interface ValidationBadgeProps {
  level: ValidationLevel;
  message: string;
  className?: string;
  showIcon?: boolean;
}

export function ValidationBadge({ 
  level, 
  message, 
  className,
  showIcon = true 
}: ValidationBadgeProps) {
  const getIcon = () => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3" />;
      case 'info':
        return <Info className="h-3 w-3" />;
      case 'success':
        return <CheckCircle className="h-3 w-3" />;
    }
  };

  const getVariant = () => {
    switch (level) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'outline';
      case 'info':
        return 'secondary';
      case 'success':
        return 'default';
    }
  };

  const getStyles = () => {
    switch (level) {
      case 'error':
        return 'border-red-300 bg-red-50 text-red-800';
      case 'warning':
        return 'border-yellow-300 bg-yellow-50 text-yellow-800';
      case 'info':
        return 'border-blue-300 bg-blue-50 text-blue-800';
      case 'success':
        return 'border-green-300 bg-green-50 text-green-800';
    }
  };

  return (
    <Badge 
      variant={getVariant()}
      className={cn(
        'text-xs flex items-center space-x-1',
        getStyles(),
        className
      )}
    >
      {showIcon && getIcon()}
      <span>{message}</span>
    </Badge>
  );
}