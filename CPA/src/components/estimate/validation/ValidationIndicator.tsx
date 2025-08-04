'use client';

import React from 'react';
import { ValidationLevel } from './ValidationBadge';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationIndicatorProps {
  level?: ValidationLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tooltip?: string;
}

export function ValidationIndicator({ 
  level, 
  size = 'sm', 
  className,
  tooltip 
}: ValidationIndicatorProps) {
  if (!level) return null;

  const getIcon = () => {
    const sizeClass = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    }[size];

    switch (level) {
      case 'error':
        return <AlertCircle className={cn(sizeClass, 'text-red-500')} />;
      case 'warning':
        return <AlertTriangle className={cn(sizeClass, 'text-yellow-500')} />;
      case 'info':
        return <Info className={cn(sizeClass, 'text-blue-500')} />;
      case 'success':
        return <CheckCircle className={cn(sizeClass, 'text-green-500')} />;
    }
  };

  return (
    <div 
      className={cn('inline-flex items-center', className)}
      title={tooltip}
    >
      {getIcon()}
    </div>
  );
}