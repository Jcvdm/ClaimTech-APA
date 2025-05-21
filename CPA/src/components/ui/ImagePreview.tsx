"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { StorageImage } from "@/components/ui/StorageImage";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Download, X, Maximize2, Minimize2, RotateCw } from "lucide-react";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Rnd } from "react-rnd";

interface ImagePreviewProps {
  bucketName?: string;
  filePath: string;
  alt: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ImagePreview({
  bucketName = "claim-attachments",
  filePath,
  alt,
  children,
  isOpen: externalIsOpen,
  onClose
}: ImagePreviewProps) {
  // Track component mount state to prevent auto-opening
  const [isMounted, setIsMounted] = useState(false);

  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });

  // Use external isOpen state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  // Log for debugging
  useEffect(() => {
    console.log("ImagePreview isOpen state:", isOpen);
    console.log("External isOpen:", externalIsOpen);
    console.log("Internal isOpen:", internalIsOpen);
  }, [isOpen, externalIsOpen, internalIsOpen]);

  // Function to set isOpen that respects external control
  const setIsOpen = (open: boolean) => {
    console.log("setIsOpen called with:", open);

    if (externalIsOpen !== undefined && onClose && !open) {
      // If externally controlled and trying to close, call onClose
      console.log("Calling onClose");
      onClose();
    } else {
      // Otherwise use internal state
      console.log("Setting internal state to:", open);
      setInternalIsOpen(open);
    }
  };
  const [isDragging, setIsDragging] = useState(false);
  const [startDragPosition, setStartDragPosition] = useState({ x: 0, y: 0 });
  const [touchStartDistance, setTouchStartDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);

  // Resize and position state
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [preMaximizedState, setPreMaximizedState] = useState<{ size: { width: number, height: number }, position: { x: number, y: number } } | null>(null);
  const [aspectRatio, setAspectRatio] = useState(1.33); // Default 4:3

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dialogOpenedRef = useRef<boolean>(false);

  const { downloadFile } = useSupabaseStorage();

  // Set mounted state on component mount
  useEffect(() => {
    setIsMounted(true);

    // Add event listener for Escape key
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        console.log("Escape key pressed, closing dialog");
        if (onClose) {
          onClose();
        }
        setInternalIsOpen(false);
        dialogOpenedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleEscapeKey);

    // Clean up function to ensure dialog is closed when component unmounts
    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
      if (onClose && externalIsOpen) {
        onClose();
      } else {
        setInternalIsOpen(false);
      }
      setIsMounted(false);
    };
  }, [isOpen, onClose, externalIsOpen]);

  // Reset zoom level and pan position when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });

      // Center the modal on initial open
      if (position.x === 0 && position.y === 0) {
        const x = Math.max(0, (window.innerWidth - size.width) / 2);
        const y = Math.max(0, (window.innerHeight - size.height) / 2);
        setPosition({ x, y });
      }
    }
  }, [isOpen, position.x, position.y, size.width, size.height]);

  // Reset pan position when zoom level is 1
  useEffect(() => {
    if (zoomLevel === 1) {
      setPanPosition({ x: 0, y: 0 });
    }
  }, [zoomLevel]);

  // Reset isOpen state when filePath changes
  useEffect(() => {
    // Force dialog to be closed when filePath changes
    if (externalIsOpen === undefined) {
      // Only control internal state if not externally controlled
      setInternalIsOpen(false);
    } else if (onClose && externalIsOpen) {
      // If externally controlled and open, provide a way to close
      onClose();
    }

    // Reset the dialog opened ref
    dialogOpenedRef.current = false;

    // Reset all state to default values
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    setIsDragging(false);
    setTouchStartDistance(null);
    setInitialZoom(1);

    console.log("FilePath changed, resetting state");
  }, [filePath, externalIsOpen, onClose]);

  // Calculate aspect ratio from image dimensions
  useEffect(() => {
    if (isOpen) {
      const img = new Image();
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        setAspectRatio(ratio);
      };
      img.src = filePath;
    }
  }, [isOpen, filePath]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  // Mouse wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Determine zoom direction based on wheel delta
    const zoomDirection = e.deltaY < 0 ? 1 : -1;

    // Adjust zoom level with smaller increments for smoother zooming
    setZoomLevel(prev => {
      const newZoom = prev + (zoomDirection * 0.1);
      return Math.min(Math.max(newZoom, 0.5), 5); // Limit zoom between 0.5x and 5x
    });
  }, []);

  // Mouse event handlers for panning
  // Only activate panning when clicking directly on the image element
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only enable panning when zoomed in
    if (zoomLevel > 1) {
      // Check if the click target is the image or its container
      const target = e.target as HTMLElement;
      const isImageOrContainer =
        target.tagName === 'IMG' ||
        target.classList.contains('image-container') ||
        target.closest('.image-container');

      if (isImageOrContainer) {
        setIsDragging(true);
        setStartDragPosition({
          x: e.clientX - panPosition.x,
          y: e.clientY - panPosition.y
        });
      }
    }
  }, [zoomLevel, panPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && zoomLevel > 1) {
      const newX = e.clientX - startDragPosition.x;
      const newY = e.clientY - startDragPosition.y;
      setPanPosition({ x: newX, y: newY });
    }
  }, [isDragging, startDragPosition, zoomLevel]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch event handlers for mobile devices
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Pinch-to-zoom gesture
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setTouchStartDistance(distance);
      setInitialZoom(zoomLevel);
    } else if (e.touches.length === 1 && zoomLevel > 1) {
      // Check if the touch target is the image or its container
      const target = e.target as HTMLElement;
      const isImageOrContainer =
        target.tagName === 'IMG' ||
        target.classList.contains('image-container') ||
        target.closest('.image-container');

      if (isImageOrContainer) {
        // Pan gesture
        setIsDragging(true);
        setStartDragPosition({
          x: e.touches[0].clientX - panPosition.x,
          y: e.touches[0].clientY - panPosition.y
        });
      }
    }
  }, [zoomLevel, panPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault(); // Prevent default browser behavior

    if (e.touches.length === 2 && touchStartDistance !== null) {
      // Handle pinch-to-zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      const scale = distance / touchStartDistance;
      const newZoom = Math.min(Math.max(initialZoom * scale, 0.5), 5);
      setZoomLevel(newZoom);
    } else if (e.touches.length === 1 && isDragging && zoomLevel > 1) {
      // Handle pan only when zoomed in
      const newX = e.touches[0].clientX - startDragPosition.x;
      const newY = e.touches[0].clientY - startDragPosition.y;
      setPanPosition({ x: newX, y: newY });
    }
  }, [touchStartDistance, initialZoom, isDragging, startDragPosition, zoomLevel]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setTouchStartDistance(null);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
        case '_':
          handleZoomOut();
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoomLevel, handleZoomIn, handleZoomOut]);

  // Handle window resize events
  useEffect(() => {
    const handleResize = () => {
      if (isMaximized) {
        setSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 });
        setPosition({ x: 20, y: 20 });
      } else {
        // Ensure modal stays within viewport
        const newPosition = {
          x: Math.min(position.x, window.innerWidth - size.width),
          y: Math.min(position.y, window.innerHeight - size.height),
        };
        if (newPosition.x !== position.x || newPosition.y !== position.y) {
          setPosition(newPosition);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMaximized, position, size]);

  // Toggle maximize/restore
  const toggleMaximize = useCallback(() => {
    if (isMaximized) {
      // Restore
      setIsMaximized(false);
      if (preMaximizedState) {
        setSize(preMaximizedState.size);
        setPosition(preMaximizedState.position);
      }
    } else {
      // Maximize
      setPreMaximizedState({ size, position });
      setIsMaximized(true);
      setSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 });
      setPosition({ x: 20, y: 20 });
    }
  }, [isMaximized, preMaximizedState, size, position]);

  const handleDownload = async () => {
    try {
      if (!filePath) return;

      // Extract the path from the URL if it's a full URL
      let path = filePath;
      if (filePath.startsWith("http") || filePath.startsWith("https")) {
        const url = new URL(filePath);
        const urlPath = url.pathname;

        // Match different Supabase URL patterns
        const pathMatch = urlPath.match(/\/storage\/v1\/object(?:\/public)?\/([^/]+)\/(.+)/);
        if (pathMatch) {
          path = pathMatch[2];
        } else {
          // Try another pattern with project ref
          const projectRefMatch = urlPath.match(/\/[^/]+\/storage\/v1\/object(?:\/public)?\/([^/]+)\/(.+)/);
          if (projectRefMatch) {
            path = projectRefMatch[2];
          }
        }
      }

      await downloadFile(bucketName, path);
      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  };

  // Only render the dialog when the component is mounted
  // This prevents issues with the dialog opening automatically
  if (!isMounted) {
    return (
      <div className="cursor-pointer group relative">
        {children}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Maximize2 className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" />
        </div>
      </div>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("Dialog onOpenChange called with:", open);

        // Always force close if we're trying to close
        if (!open) {
          // Force close the dialog
          setIsOpen(false);
          dialogOpenedRef.current = false;

          // Reset all state to default values
          setZoomLevel(1);
          setPanPosition({ x: 0, y: 0 });
          setIsDragging(false);
          setTouchStartDistance(null);
          setInitialZoom(1);

          // Add a small delay to ensure state is updated
          setTimeout(() => {
            console.log("Dialog state after timeout:", isOpen);
          }, 100);
        } else {
          // Only open if we're explicitly trying to open
          setIsOpen(open);
          dialogOpenedRef.current = true;
        }
      }}
      modal={true}
    >
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
        onClick={(e) => {
          // Close when clicking the backdrop
          if (e.target === e.currentTarget) {
            if (onClose) {
              onClose();
            }
            setInternalIsOpen(false);
            dialogOpenedRef.current = false;
          }
        }}
      >
        <Rnd
          size={size}
          position={position}
          minWidth={400}
          minHeight={300}
          maxWidth={window.innerWidth - 40}
          maxHeight={window.innerHeight - 40}
          lockAspectRatio={aspectRatio}
          disableDragging={isMaximized}
          enableResizing={!isMaximized}
          onResize={(e, direction, ref, delta, newPosition) => {
            setSize({
              width: ref.offsetWidth,
              height: ref.offsetHeight,
            });
            setPosition(newPosition);
          }}
          onDragStop={(e, d) => {
            setPosition({ x: d.x, y: d.y });
          }}
          className={cn(
            "bg-background border rounded-lg shadow-lg overflow-hidden",
            "focus:outline-none focus:ring-2 focus:ring-primary"
          )}
          resizeHandleStyles={{
            bottom: { height: '10px', cursor: 'ns-resize' },
            bottomLeft: { height: '10px', width: '10px', cursor: 'nesw-resize' },
            bottomRight: { height: '10px', width: '10px', cursor: 'nwse-resize' },
            left: { width: '10px', cursor: 'ew-resize' },
            right: { width: '10px', cursor: 'ew-resize' },
            top: { height: '10px', cursor: 'ns-resize' },
            topLeft: { height: '10px', width: '10px', cursor: 'nwse-resize' },
            topRight: { height: '10px', width: '10px', cursor: 'nesw-resize' },
          }}
          resizeHandleClasses={{
            bottom: 'bg-transparent hover:bg-primary/20',
            bottomLeft: 'bg-transparent hover:bg-primary/20',
            bottomRight: 'bg-transparent hover:bg-primary/20',
            left: 'bg-transparent hover:bg-primary/20',
            right: 'bg-transparent hover:bg-primary/20',
            top: 'bg-transparent hover:bg-primary/20',
            topLeft: 'bg-transparent hover:bg-primary/20',
            topRight: 'bg-transparent hover:bg-primary/20',
          }}
        >
        <div className="relative w-full h-full">
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button variant="secondary" size="icon" onClick={handleZoomOut} title="Zoom Out (- key)">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleZoomIn} title="Zoom In (+ key)">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => { setZoomLevel(1); setPanPosition({ x: 0, y: 0 }); }}
              title="Reset Zoom (0 key)"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleDownload} title="Download">
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleMaximize}
              title={isMaximized ? "Restore" : "Maximize"}
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                // Force close the dialog
                document.body.click(); // Force any open dialogs to close

                // Call onClose if provided (for external control)
                if (onClose) {
                  onClose();
                }

                // Explicitly set state
                setInternalIsOpen(false);
                dialogOpenedRef.current = false;

                // Reset all state to default values
                setZoomLevel(1);
                setPanPosition({ x: 0, y: 0 });
                setIsDragging(false);
                setTouchStartDistance(null);
                setInitialZoom(1);

                // Log for debugging
                console.log("Close button clicked, dialog state set to:", false);
              }}
              title="Close (Esc key)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom level and pan indicator */}
          <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs flex items-center gap-2">
            <span>{Math.round(zoomLevel * 100)}%</span>
            {zoomLevel > 1 && (
              <span className="text-muted-foreground flex items-center">
                <span className="inline-block w-3 h-3 rounded-full border border-current mr-1 animate-pulse"></span>
                Click and drag to pan
              </span>
            )}
          </div>

          <div
            ref={containerRef}
            className={cn(
              "image-container", // Add class for targeting in event handlers
              "flex items-center justify-center w-full overflow-hidden",
              // Responsive height based on screen dimensions
              "h-[60vh] sm:h-[65vh] md:h-[70vh] lg:h-[75vh] xl:h-[80vh]",
              // Cursor styles
              zoomLevel > 1 ? "cursor-grab" : "cursor-zoom-in",
              isDragging && "cursor-grabbing"
            )}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="image-wrapper relative"
              style={{
                transform: `translate3d(${panPosition.x}px, ${panPosition.y}px, 0) scale(${zoomLevel})`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            >
              <StorageImage
                ref={imageRef}
                bucketName={bucketName}
                filePath={filePath}
                alt={alt}
                width={1600}
                height={1200}
                objectFit="contain"
                className="image-container max-w-full" // Allow image to take full width
                style={{
                  maxHeight: '100%',
                  height: 'auto',
                  width: 'auto',
                  objectFit: 'contain'
                }}
                unoptimized
              />
            </div>
          </div>
        </div>
        </Rnd>
      </div>
    </Dialog>
  );
}
