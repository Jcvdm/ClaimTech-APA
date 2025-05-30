"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";

// Mock user for development - in production, this would come from an API call
const MOCK_USER = {
  id: "fb0c14a7-550a-4d41-90f4-86d714961f87", // Match the ID used in tRPC context
  email: "dev-user@example.com",
  name: "Development User",
  role: "authenticated",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    // In development, we'll use a mock user
    // In production, this would check for an existing session
    const initAuth = async () => {
      try {
        // For development, just set the mock user
        // In production, this would be a real auth check
        setUser(MOCK_USER);
      } catch (error) {
        console.error("Auth initialization error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (isLoading) {
      initAuth();
    }
  }, [setUser, setLoading, isLoading]);

  return <>{children}</>;
}
