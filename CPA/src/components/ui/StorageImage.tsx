"use client";

import { useState, useEffect, forwardRef } from "react";
import type { ForwardedRef } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/utils/supabase/client";

// Create a global cache for image URLs
// This will persist across component renders but will be reset on page refresh
const imageUrlCache = new Map<string, string>();

interface StorageImageProps {
  bucketName?: string;
  filePath: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  priority?: boolean;
  unoptimized?: boolean;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}

/**
 * A component that displays an image from Supabase Storage
 * It regenerates the public URL on each render to ensure it's always valid
 */
export const StorageImage = forwardRef<HTMLImageElement, StorageImageProps>(({
  bucketName = "claim-attachments",
  filePath,
  alt,
  className,
  width,
  height,
  fill = false,
  sizes,
  objectFit = "cover",
  priority = false,
  unoptimized = true,
  style,
  onClick,
}, ref) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchImageUrl = async () => {
      if (!filePath) {
        console.log("StorageImage: No filePath provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("StorageImage: Processing filePath:", filePath);

        // Extract the path from the URL if it's a full URL
        let path = filePath;
        let extractedBucketName = bucketName;

        // Handle different URL formats
        if (filePath.startsWith("http") || filePath.startsWith("https")) {
          console.log("StorageImage: Path is a URL, extracting...");
          try {
            // Extract path from Supabase URL format
            const urlObj = new URL(filePath);

            // Handle URLs with query parameters
            const urlPath = urlObj.pathname;
            console.log("StorageImage: URL pathname:", urlPath);

            // Match different Supabase URL patterns
            // Pattern 1: /storage/v1/object/public/{bucket}/{path}
            // Pattern 2: /storage/v1/object/{bucket}/{path}
            // Pattern 3: /{project-ref}/storage/v1/object/public/{bucket}/{path}
            // Pattern 4: /{project-ref}/storage/v1/object/{bucket}/{path}

            const pathMatch = urlPath.match(/\/storage\/v1\/object(?:\/public)?\/([^/]+)\/(.+)/);

            if (pathMatch && pathMatch.length >= 3) {
              if (pathMatch[1] && pathMatch[2]) {
                extractedBucketName = pathMatch[1];
                path = pathMatch[2];
                console.log(`StorageImage: Extracted bucket: ${extractedBucketName}, path: ${path}`);
              } else {
                console.warn("StorageImage: Regex matched but groups are undefined");
              }
            } else {
              // Try alternative pattern with project ref
              const altPathMatch = urlPath.match(/\/[^/]+\/storage\/v1\/object(?:\/public)?\/([^/]+)\/(.+)/);
              if (altPathMatch && altPathMatch.length >= 3) {
                if (altPathMatch[1] && altPathMatch[2]) {
                  extractedBucketName = altPathMatch[1];
                  path = altPathMatch[2];
                  console.log(`StorageImage: Extracted bucket from alt pattern: ${extractedBucketName}, path: ${path}`);
                } else {
                  console.warn("StorageImage: Alt regex matched but groups are undefined");
                }
              } else {
                console.warn("StorageImage: URL does not match expected Supabase patterns:", urlPath);
              }
            }
          } catch (error) {
            console.error("StorageImage: Error parsing URL:", error);
          }
        } else if (path.includes(`${bucketName}/`)) {
          console.log("StorageImage: Path includes bucketName, extracting...");
          const parts = path.split(`${bucketName}/`);
          if (parts.length > 1 && parts[1]) {
            path = parts[1];
            console.log(`StorageImage: Extracted path: ${path}`);
          } else {
            console.warn("StorageImage: Failed to extract path from:", path);
          }
        } else if (path.startsWith('/')) {
          // Handle paths that start with a slash
          console.log("StorageImage: Path starts with slash, removing...");
          path = path.substring(1);
          console.log(`StorageImage: Path after removing slash: ${path}`);
        }

        // Validate the extracted path
        if (!path) {
          throw new Error("Failed to extract a valid path from the provided filePath");
        }

        console.log("StorageImage: Final path for URL generation:", path);
        console.log("StorageImage: Using bucket:", extractedBucketName);

        // Create a cache key based on bucket name and file path
        const cacheKey = `${extractedBucketName}:${path}`;

        // Check if the URL is already in the cache
        if (imageUrlCache.has(cacheKey)) {
          const cachedUrl = imageUrlCache.get(cacheKey);
          console.log("StorageImage: Using cached URL:", cachedUrl);
          if (cachedUrl) {
            setImageUrl(cachedUrl);
            setIsLoading(false);
            return;
          }
        }

        // Create a Supabase client using the project's createClient function
        const supabase = createClient();

        // Generate a fresh public URL but don't use download parameter to prevent direct navigation
        // Instead, we'll handle downloads separately through the downloadFile function
        const { data } = supabase.storage.from(extractedBucketName).getPublicUrl(path, {
          download: false, // Set to false to prevent automatic download behavior
        });

        console.log("StorageImage: Generated URL:", data.publicUrl);

        // Store the URL in the cache for future use
        imageUrlCache.set(cacheKey, data.publicUrl);

        // Set the image URL for display
        setImageUrl(data.publicUrl);
      } catch (err) {
        console.error("StorageImage: Error fetching image URL:", err);
        setError(err instanceof Error ? err : new Error("Unknown error fetching image URL"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchImageUrl();
  }, [bucketName, filePath, user?.id]);

  if (isLoading) {
    return <Skeleton className={className || (fill ? "w-full h-full" : `w-${width} h-${height}`)} />;
  }

  if (error || !imageUrl || !filePath) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className || (fill ? "w-full h-full" : `w-${width} h-${height}`)}`}>
        <span className="text-xs text-muted-foreground">Image not available</span>
      </div>
    );
  }

  return (
    <Image
      ref={ref}
      src={imageUrl}
      alt={alt}
      className={className}
      width={width}
      height={height}
      fill={fill}
      sizes={sizes}
      style={{ objectFit, ...style }}
      priority={priority}
      unoptimized={unoptimized}
      onClick={onClick}
    />
  );
});
