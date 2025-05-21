"use client";

// src/features/claims/hooks/useClaimTabs.ts
import { useState } from 'react';

export type ClaimTabValue = 'summary' | 'appointment' | 'inspection' | 'estimate' | 'pre-incident' | 'history';

/**
 * Hook for managing tabs in the claim detail view
 */
export function useClaimTabs() {
  const [activeTab, setActiveTab] = useState<ClaimTabValue>('summary');

  /**
   * Change the active tab
   * @param tab The tab to activate
   */
  const changeTab = (tab: ClaimTabValue) => {
    setActiveTab(tab);
  };

  return {
    activeTab,
    changeTab
  };
}
