"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { createBrowserClient } from '@supabase/ssr';
import { v4 as uuidv4 } from "uuid";
import { useAuthStore } from "@/stores/authStore";

interface UploadOptions {
  bucketName: string;
  path: string;
  file: File;
  onProgress?: (progress: number) => void;
}

interface UseSupabaseStorageReturn {
  uploadFile: (options: UploadOptions) => Promise<string | null>;
  deleteFile: (bucketName: string, path: string) => Promise<boolean>;
  downloadFile: (bucketName: string, path: string, fileName?: string) => Promise<void>;
  isUploading: boolean;
  error: Error | null;
}

/**
 * Custom hook for interacting with Supabase Storage
 * @returns Object with upload and delete functions, loading state, and error
 */
export function useSupabaseStorage(): UseSupabaseStorageReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create a direct Supabase client with the anon key
  const supabase = createBrowserClient(
    "https://swytlwcofrxsupfjexne.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3eXRsd2NvZnJ4c3VwZmpleG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4Nzk5NTAsImV4cCI6MjA2MDQ1NTk1MH0.cL9zluFMPDbLvOPuMvI85lSh81b2RPeg6yJSW5z2JMg",
    {
      auth: {
        persistSession: false,
        // In development, we'll use a mock user ID
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    }
  );

  const { user, isAuthenticated } = useAuthStore();

  /**
   * Upload a file to Supabase Storage
   * @param options Upload options
   * @returns The public URL of the uploaded file, or null if upload failed
   */
  const uploadFile = useCallback(
    async ({ bucketName = "claim-attachments", path, file, onProgress }: UploadOptions): Promise<string | null> => {
      setIsUploading(true);
      setError(null);

      try {
        // Generate a unique filename to avoid collisions
        const fileExt = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const fullPath = `${path}/${fileName}`;

        // In development, we'll proceed even without authentication
        const isDev = process.env.NODE_ENV === 'development';

        if (!isDev && (!isAuthenticated || !user)) {
          throw new Error("User is not authenticated. Please log in to upload files.");
        }

        // Use the mock user ID in development if no user is available
        const userId = user?.id || (isDev ? 'fb0c14a7-550a-4d41-90f4-86d714961f87' : null);

        if (!userId) {
          throw new Error("User ID not available. Cannot upload files.");
        }

        console.log(`Uploading file to ${bucketName}/${fullPath} as user ${userId}`);

        // Upload the file
        // In development, we'll manually set the auth header with the mock user ID
        const headers = {};
        if (process.env.NODE_ENV === 'development') {
          // Set a custom header that might help with RLS policies
          headers['x-client-info'] = 'supabase-js/2.38.4';
        }

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(fullPath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type, // Explicitly set content type
            duplex: 'half',
          });

        if (error) {
          console.error("Supabase storage upload error:", error);
          throw new Error(`Error uploading file: ${error.message}`);
        }

        console.log("File uploaded successfully:", data);

        // Get the public URL
        const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fullPath);

        return urlData.publicUrl;
      } catch (err) {
        console.error("Error uploading file:", err);
        setError(err instanceof Error ? err : new Error("Unknown error during upload"));
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [user, isAuthenticated]
  );

  /**
   * Delete a file from Supabase Storage
   * @param bucketName The name of the bucket
   * @param path The path to the file
   * @returns True if deletion was successful, false otherwise
   */
  const deleteFile = useCallback(
    async (bucketName: string, path: string): Promise<boolean> => {
      try {
        // In development, we'll proceed even without authentication
        const isDev = process.env.NODE_ENV === 'development';

        if (!isDev && (!isAuthenticated || !user)) {
          throw new Error("User is not authenticated. Please log in to delete files.");
        }

        // Use the mock user ID in development if no user is available
        const userId = user?.id || (isDev ? 'fb0c14a7-550a-4d41-90f4-86d714961f87' : null);

        if (!userId) {
          throw new Error("User ID not available. Cannot delete files.");
        }

        console.log(`Deleting file from ${bucketName}/${path} as user ${userId}`);

        const { error } = await supabase.storage.from(bucketName).remove([path]);

        if (error) {
          console.error("Supabase storage delete error:", error);
          throw new Error(`Error deleting file: ${error.message}`);
        }

        console.log("File deleted successfully");
        return true;
      } catch (err) {
        console.error("Error deleting file:", err);
        setError(err instanceof Error ? err : new Error("Unknown error during deletion"));
        return false;
      }
    },
    [user, isAuthenticated]
  );

  /**
   * Download a file from Supabase Storage
   * @param bucketName The name of the bucket
   * @param path The path to the file
   * @param fileName Optional custom filename for the downloaded file
   */
  const downloadFile = useCallback(
    async (bucketName: string, path: string, fileName?: string): Promise<void> => {
      try {
        // Get the download URL from Supabase
        const { data } = supabase.storage.from(bucketName).getPublicUrl(path, {
          download: true,
        });

        // Create a temporary anchor element to trigger the download
        // Use download attribute to force download instead of navigation
        const link = document.createElement('a');
        link.href = data.publicUrl;
        link.download = fileName || path.split('/').pop() || 'download';
        link.target = '_blank'; // Open in new tab if download fails
        link.rel = 'noopener noreferrer'; // Security best practice

        // Prevent default navigation
        link.onclick = (e) => {
          e.stopPropagation();
        };

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        console.error("Error downloading file:", err);
        setError(err instanceof Error ? err : new Error("Unknown error during download"));
      }
    },
    [supabase]
  );

  return {
    uploadFile,
    deleteFile,
    downloadFile,
    isUploading,
    error,
  };
}
