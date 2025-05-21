"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { StorageImage } from "@/components/ui/StorageImage";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Download, X, Maximize2 } from "lucide-react";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { toast } from "sonner";

interface ImagePreviewWrapperProps {
  bucketName?: string;
  filePath: string;
  alt: string;
  children: React.ReactNode;
}

/**
 * A simplified image preview component that uses the Dialog component directly.
 */
export function ImagePreviewWrapper({ bucketName = "claim-attachments", filePath, alt, children }: ImagePreviewWrapperProps) {
  // State for dialog
  const [isOpen, setIsOpen] = useState(false);

  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Size and position state
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const { downloadFile } = useSupabaseStorage();

  // Handle download
  const handleDownload = async () => {
    try {
      if (!filePath) return;

      // Extract path from URL if needed
      let path = filePath;
      if (filePath.startsWith("http") || filePath.startsWith("https")) {
        const url = new URL(filePath);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object(?:\/public)?\/([^/]+)\/(.+)/);
        if (pathMatch) {
          path = pathMatch[2];
        }
      }

      await downloadFile(bucketName, path);
      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  };

  // Reset state when dialog closes
  const handleClose = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setIsOpen(false);
  };

  // Reset state when filePath changes
  useEffect(() => {
    // Close the dialog and reset state when filePath changes
    setIsOpen(false);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setIsDragging(false);

    console.log("FilePath changed, resetting state");
  }, [filePath]);

  // Add keyboard event handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case '+':
        case '=':
          setZoomLevel(prev => Math.min(prev + 0.25, 5));
          break;
        case '-':
        case '_':
          setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
          break;
        case 'ArrowUp':
          if (zoomLevel > 1) {
            setPanPosition(prev => ({ ...prev, y: prev.y + 20 }));
          }
          break;
        case 'ArrowDown':
          if (zoomLevel > 1) {
            setPanPosition(prev => ({ ...prev, y: prev.y - 20 }));
          }
          break;
        case 'ArrowLeft':
          if (zoomLevel > 1) {
            setPanPosition(prev => ({ ...prev, x: prev.x + 20 }));
          }
          break;
        case 'ArrowRight':
          if (zoomLevel > 1) {
            setPanPosition(prev => ({ ...prev, x: prev.x - 20 }));
          }
          break;
        case '0':
          // Reset zoom and pan
          setZoomLevel(1);
          setPanPosition({ x: 0, y: 0 });
          break;
        case 'Escape':
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoomLevel, handleClose]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // Reset state when dialog closes
          handleClose();
        } else {
          setIsOpen(open);
        }
      }}
    >
      <DialogTrigger asChild>
        <div className="cursor-pointer group relative">
          {children}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" />
          </div>
        </div>
      </DialogTrigger>

      <DialogContent
        className="sm:max-w-[90vw] max-h-[90vh] p-0 border bg-background"
        onEscapeKeyDown={handleClose}
        onInteractOutside={handleClose}
      >
        <div className="relative w-full h-full flex flex-col">
          {/* Controls */}
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button variant="secondary" size="icon" onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 5))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image container */}
          <div
            className="w-full h-full min-h-[70vh] flex items-center justify-center overflow-hidden"
            onMouseDown={(e) => {
              if (zoomLevel > 1) {
                setIsDragging(true);
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && zoomLevel > 1) {
                setPanPosition(prev => ({
                  x: prev.x + e.movementX,
                  y: prev.y + e.movementY
                }));
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onWheel={(e) => {
              e.preventDefault();
              // Determine zoom direction based on wheel delta
              const zoomDirection = e.deltaY < 0 ? 1 : -1;
              // Adjust zoom level with smaller increments for smoother zooming
              setZoomLevel(prev => {
                const newZoom = prev + (zoomDirection * 0.1);
                return Math.min(Math.max(newZoom, 0.5), 5); // Limit zoom between 0.5x and 5x
              });
            }}
          >
            <div
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
                transition: isDragging ? 'none' : 'transform 0.2s',
              }}
            >
              <StorageImage
                bucketName={bucketName}
                filePath={filePath}
                alt={alt}
                width={1600}
                height={1200}
                className="max-w-full max-h-full object-contain"
                style={{
                  maxHeight: '70vh',
                  maxWidth: '80vw',
                  height: 'auto',
                  width: 'auto',
                }}
                unoptimized
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
