'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export type FormStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unsaved';

interface StatusBadgeProps {
  status: FormStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
        return {
          label: 'Ready',
          variant: 'outline' as const,
          icon: null,
        };
      case 'saving':
        return {
          label: 'Saving...',
          variant: 'outline' as const,
          icon: <Loader2 className="h-3 w-3 animate-spin mr-1" />,
        };
      case 'saved':
        return {
          label: 'All changes saved',
          variant: 'success' as const,
          icon: <CheckCircle2 className="h-3 w-3 mr-1" />,
        };
      case 'error':
        return {
          label: 'Error saving',
          variant: 'destructive' as const,
          icon: <AlertCircle className="h-3 w-3 mr-1" />,
        };
      case 'unsaved':
        return {
          label: 'Unsaved changes',
          variant: 'secondary' as const,
          icon: null,
        };
      default:
        return {
          label: 'Ready',
          variant: 'outline' as const,
          icon: null,
        };
    }
  };

  const { label, variant, icon } = getStatusConfig();

  return (
    <Badge variant={variant} className={cn('flex items-center', className)}>
      {icon}
      {label}
    </Badge>
  );
}
