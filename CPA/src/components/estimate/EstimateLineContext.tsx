'use client';

import React, { createContext, useContext } from 'react';
import { type Estimate, type EstimateLine } from '@/lib/api/domains/estimates/types';
import { type UseEstimateSessionReturn } from '@/hooks/useEstimateSession';
import { type KeyboardNavigationManager, type CellCoordinate } from '@/hooks/useKeyboardNavigation';

export interface EstimateLineContextValue {
  estimate: Estimate;
  lines: EstimateLine[];
  session: UseEstimateSessionReturn;
  keyboardNav: KeyboardNavigationManager;
  readonly: boolean;
  selectedRows: Set<string>;
  focusedCell: CellCoordinate | null;
  isLoading: boolean;
}

const EstimateLineContext = createContext<EstimateLineContextValue | null>(null);

interface EstimateLineProviderProps {
  value: EstimateLineContextValue;
  children: React.ReactNode;
}

export function EstimateLineProvider({ value, children }: EstimateLineProviderProps) {
  return (
    <EstimateLineContext.Provider value={value}>
      {children}
    </EstimateLineContext.Provider>
  );
}

export function useEstimateLineContext() {
  const context = useContext(EstimateLineContext);
  if (!context) {
    throw new Error('useEstimateLineContext must be used within an EstimateLineProvider');
  }
  return context;
}