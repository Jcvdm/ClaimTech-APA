import { type ClaimWithRelations } from '@/lib/api/domains/claims';
import React from 'react';

export interface Column {
  id: string;
  header: string;
  cell: (claim: ClaimWithRelations) => React.ReactNode;
  className?: string;
}
