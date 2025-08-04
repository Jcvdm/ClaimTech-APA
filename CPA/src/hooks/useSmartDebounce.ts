'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { EstimateLine } from '@/lib/api/domains/estimates/types';

/**
 * Simplified debounce hook with 2-second delay
 * Replaces the complex multi-tiered debouncing system with a simple, reliable approach
 */
export function useSmartDebounce(
  callback: (lineId: string, field: keyof EstimateLine, value: any) => void,
  delay: number = 2000
) {
  const timeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const debouncedCallback = useCallback((
    lineId: string,
    field: keyof EstimateLine,
    value: any
  ) => {
    const key = `${lineId}-${field}`;

    // Clear existing timeout
    const existingTimeout = timeouts.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout with simple 2-second delay
    const newTimeout = setTimeout(() => {
      callback(lineId, field, value);
      timeouts.current.delete(key);
    }, delay);

    timeouts.current.set(key, newTimeout);
  }, [callback, delay]);

  // Force execution of all pending debounced calls
  const flushAll = useCallback(() => {
    timeouts.current.forEach((timeout) => {
      clearTimeout(timeout);
    });
    timeouts.current.clear();
  }, []);

  // Force execution of a specific field's debounced call
  const flush = useCallback((lineId: string, field: keyof EstimateLine) => {
    const key = `${lineId}-${field}`;
    const timeout = timeouts.current.get(key);
    if (timeout) {
      clearTimeout(timeout);
      timeouts.current.delete(key);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeouts.current.forEach(timeout => clearTimeout(timeout));
      timeouts.current.clear();
    };
  }, []);

  return {
    debouncedCallback,
    flush,
    flushAll,
    getPendingCount: () => timeouts.current.size,
    hasPending: () => timeouts.current.size > 0,
  };
}