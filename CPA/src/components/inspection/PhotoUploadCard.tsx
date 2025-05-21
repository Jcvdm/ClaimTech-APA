"use client";

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon, Download } from 'lucide-react';
import { useSupabaseStorage } from '@/hooks/useSupabaseStorage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StorageImage } from '@/components/ui/StorageImage';
import { ImagePreviewWrapper } from '@/components/ui/ImagePreviewWrapper';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PhotoUploadCardProps {
  title: string;
  description?: string;
  imagePath: string | null;
  onImagePathChange: (path: string | null) => void;
  bucketName?: string;
  uploadPath: string;
  size?: "default" | "small";
  layout?: "block" | "inline";
  className?: string;
}

export function PhotoUploadCard({
  title,
  description,
  imagePath,
  onImagePathChange,
  bucketName = "claim-attachments",
  uploadPath,
  size = "default",
  layout = "block",
  className
}: PhotoUploadCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { uploadFile, deleteFile, downloadFile } = useSupabaseStorage();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);

    try {
      // Prevent browser navigation by using preventDefault in case of any events
      const result = await uploadFile({
        bucketName,
        path: uploadPath,
        file
      });

      if (result) {
        // Store the URL but prevent any automatic navigation
        onImagePathChange(result);

        // Use setTimeout to ensure the state update completes before showing the toast
        setTimeout(() => {
          toast.success("Image uploaded successfully");
        }, 100);
      } else {
        toast.error("Failed to upload image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  }, [bucketName, uploadPath, uploadFile, onImagePathChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': []
    },
    maxFiles: 1,
    multiple: false
  });

  const handleRemove = async () => {
    if (!imagePath) return;

    try {
      // Extract the path from the URL
      const url = new URL(imagePath);
      const pathParts = url.pathname.split('/');
      const storagePath = pathParts.slice(pathParts.indexOf(bucketName) + 1).join('/');

      await deleteFile(bucketName, storagePath);
      onImagePathChange(null);
      toast.success("Image removed successfully");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove image");
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDownload = async () => {
    if (!imagePath) return;

    try {
      // Extract the path from the URL
      const url = new URL(imagePath);
      const pathParts = url.pathname.split('/');
      const storagePath = pathParts.slice(pathParts.indexOf(bucketName) + 1).join('/');

      // Generate a filename based on the title and current date
      const fileName = `${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.jpg`;

      await downloadFile(bucketName, storagePath, fileName);
      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  };

  // Use consistent height to match damage assessment section
  const imageHeight = size === "small" ? "h-24" : "h-32";
  const iconSize = size === "small" ? "h-6 w-6" : "h-8 w-8";
  const textSize = "text-xs";

  // Determine container classes based on layout and size
  const containerClasses = cn(
    "overflow-hidden rounded-md",
    {
      "w-full max-w-[200px]": layout === "block",
      "inline-block max-w-[200px]": layout === "inline",
      "h-full max-h-[200px]": size === "default",
      "h-full max-h-[150px]": size === "small"
    },
    className
  );

  return (
    <div className={containerClasses}>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The image will be permanently deleted from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {imagePath ? (
        <div className="relative border border-border rounded-md overflow-hidden w-full h-full">
          <ImagePreviewWrapper
            bucketName={bucketName}
            filePath={imagePath}
            alt={title}
          >
            <div className="w-full h-full relative aspect-square">
              <StorageImage
                bucketName={bucketName}
                filePath={imagePath}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, 200px"
                className="object-cover"
                unoptimized
              />
            </div>
          </ImagePreviewWrapper>

          <div className="absolute top-1 right-1 flex gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-6 w-6 rounded-full bg-background/80 hover:bg-background"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-3 w-3" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={() => setIsDeleteDialogOpen(true)}
              title="Delete"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {size !== "small" && (
            <div className="absolute bottom-0 left-0 right-0 bg-background/80 p-2">
              <p className={`${textSize} font-medium truncate`}>{title}</p>
            </div>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center border rounded-md transition-colors w-full h-full aspect-square",
            isDragActive ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-muted-foreground'
          )}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mb-1"></div>
              <p className={`${textSize} font-medium`}>Uploading...</p>
            </div>
          ) : (
            <>
              {isDragActive ? (
                <div className="flex flex-col items-center justify-center">
                  <Upload className={`${iconSize} text-primary mb-1`} />
                  <p className={`${textSize} font-medium`}>Drop file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <Upload className={`${iconSize} text-muted-foreground mb-1`} />
                  {size !== "small" ? (
                    <>
                      <p className={`${textSize} font-medium`}>{title}</p>
                      {description && (
                        <p className="text-xs text-muted-foreground mt-1 text-center">{description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Drag & drop or click
                      </p>
                    </>
                  ) : (
                    <p className="text-xs">Upload</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
