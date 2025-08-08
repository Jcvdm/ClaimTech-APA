'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook to track if a component is still mounted
 * Useful for preventing state updates after component unmounts
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Return both the ref and a callback for checking mount status
  const isMounted = useCallback(() => isMountedRef.current, []);

  return {
    isMountedRef,
    isMounted
  };
}

/**
 * Safe setState that only executes if component is still mounted
 */
export function useSafeState<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const { isMounted } = useIsMounted();

  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (isMounted()) {
      setState(value);
    }
  }, [isMounted]);

  return [state, safeSetState] as const;
}

/**
 * Safe async operation that only executes callbacks if component is still mounted
 */
export function useSafeAsync() {
  const { isMounted } = useIsMounted();

  const safeAsync = useCallback(<T>(
    asyncFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ) => {
    asyncFn()
      .then((result) => {
        if (isMounted() && onSuccess) {
          onSuccess(result);
        }
      })
      .catch((error) => {
        if (isMounted() && onError) {
          onError(error);
        }
      });
  }, [isMounted]);

  return { safeAsync, isMounted };
}