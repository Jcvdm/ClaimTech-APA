"use client";

// src/features/claims/hooks/useClaimExpansion.ts
import { useState } from 'react';

/**
 * Hook for managing expandable rows in the claims table
 * Only one row can be expanded at a time
 */
export function useClaimExpansion() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /**
   * Toggle expansion for a claim
   * @param id The claim ID to toggle
   */
  const toggleExpansion = (id: string) => {
    setExpandedId(prevId => prevId === id ? null : id);
  };

  /**
   * Check if a claim is expanded
   * @param id The claim ID to check
   */
  const isExpanded = (id: string) => expandedId === id;

  /**
   * Close all expanded rows
   */
  const closeAll = () => {
    setExpandedId(null);
  };

  return {
    expandedId,
    toggleExpansion,
    isExpanded,
    closeAll
  };
}
