"use client";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, useEffect } from "react";

/**
 * React Query DevTools component with client-side only rendering
 */
export function ReactQueryDevToolsWrapper() {
  // Only render DevTools on the client
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return (
    <ReactQueryDevtools
      initialIsOpen={false}
      position="bottom-right"
      buttonPosition="bottom-right"
    />
  );
}
