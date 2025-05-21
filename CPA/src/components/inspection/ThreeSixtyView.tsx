"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Camera, Download } from "lucide-react";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { type Inspection } from "@/lib/api/domains/inspections/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { StorageImage } from "@/components/ui/StorageImage";
import { ImagePreviewWrapper } from "@/components/ui/ImagePreviewWrapper";
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

interface ThreeSixtyViewProps {
  claimId: string;
  inspectionId?: string;
  frontViewPhotoPath: string | null;
  rightFrontViewPhotoPath: string | null;
  rightSideViewPhotoPath: string | null;
  rightRearViewPhotoPath: string | null;
  rearViewPhotoPath: string | null;
  leftRearViewPhotoPath: string | null;
  leftSideViewPhotoPath: string | null;
  leftFrontViewPhotoPath: string | null;
  onFrontViewPhotoPathChange: (path: string | null) => void;
  onRightFrontViewPhotoPathChange: (path: string | null) => void;
  onRightSideViewPhotoPathChange: (path: string | null) => void;
  onRightRearViewPhotoPathChange: (path: string | null) => void;
  onRearViewPhotoPathChange: (path: string | null) => void;
  onLeftRearViewPhotoPathChange: (path: string | null) => void;
  onLeftSideViewPhotoPathChange: (path: string | null) => void;
  onLeftFrontViewPhotoPathChange: (path: string | null) => void;
  existingInspection?: Inspection;
}

type ViewPosition =
  | "front"
  | "right-front"
  | "right-side"
  | "right-rear"
  | "rear"
  | "left-rear"
  | "left-side"
  | "left-front";

export function ThreeSixtyView({
  claimId,
  inspectionId = "new",
  frontViewPhotoPath,
  rightFrontViewPhotoPath,
  rightSideViewPhotoPath,
  rightRearViewPhotoPath,
  rearViewPhotoPath,
  leftRearViewPhotoPath,
  leftSideViewPhotoPath,
  leftFrontViewPhotoPath,
  onFrontViewPhotoPathChange,
  onRightFrontViewPhotoPathChange,
  onRightSideViewPhotoPathChange,
  onRightRearViewPhotoPathChange,
  onRearViewPhotoPathChange,
  onLeftRearViewPhotoPathChange,
  onLeftSideViewPhotoPathChange,
  onLeftFrontViewPhotoPathChange,
  existingInspection,
}: ThreeSixtyViewProps) {
  const [activePosition, setActivePosition] = useState<ViewPosition>("front");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { uploadFile, deleteFile, downloadFile, isUploading, error } = useSupabaseStorage();

  const getPhotoPath = (position: ViewPosition): string | null => {
    switch (position) {
      case "front": return frontViewPhotoPath;
      case "right-front": return rightFrontViewPhotoPath;
      case "right-side": return rightSideViewPhotoPath;
      case "right-rear": return rightRearViewPhotoPath;
      case "rear": return rearViewPhotoPath;
      case "left-rear": return leftRearViewPhotoPath;
      case "left-side": return leftSideViewPhotoPath;
      case "left-front": return leftFrontViewPhotoPath;
      default: return null;
    }
  };

  const handlePhotoPathChange = (position: ViewPosition, path: string | null) => {
    switch (position) {
      case "front": onFrontViewPhotoPathChange(path); break;
      case "right-front": onRightFrontViewPhotoPathChange(path); break;
      case "right-side": onRightSideViewPhotoPathChange(path); break;
      case "right-rear": onRightRearViewPhotoPathChange(path); break;
      case "rear": onRearViewPhotoPathChange(path); break;
      case "left-rear": onLeftRearViewPhotoPathChange(path); break;
      case "left-side": onLeftSideViewPhotoPathChange(path); break;
      case "left-front": onLeftFrontViewPhotoPathChange(path); break;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const path = `claims/${claimId}/inspections/${inspectionId}/360-view/${activePosition}`;
      const result = await uploadFile({
        bucketName: "claim-attachments",
        path,
        file: selectedFile,
      });

      if (result) {
        // Store the URL but prevent any automatic navigation
        handlePhotoPathChange(activePosition, result);
        setSelectedFile(null);

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
    }
  };

  const handleRemovePhoto = async () => {
    if (!getPhotoPath(activePosition)) return;

    try {
      const imagePath = getPhotoPath(activePosition);
      if (!imagePath) return;

      // Extract the path from the URL
      const url = new URL(imagePath);
      const pathParts = url.pathname.split('/');
      const storagePath = pathParts.slice(pathParts.indexOf("claim-attachments") + 1).join('/');

      await deleteFile("claim-attachments", storagePath);
      handlePhotoPathChange(activePosition, null);
      toast.success("Image removed successfully");
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove image");
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDownload = async () => {
    if (!getPhotoPath(activePosition)) return;

    try {
      const imagePath = getPhotoPath(activePosition);
      if (!imagePath) return;

      // Extract the path from the URL
      const url = new URL(imagePath);
      const pathParts = url.pathname.split('/');
      const storagePath = pathParts.slice(pathParts.indexOf("claim-attachments") + 1).join('/');

      // Generate a filename based on the position and current date
      const fileName = `${positionLabels[activePosition].replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.jpg`;

      await downloadFile("claim-attachments", storagePath, fileName);
      toast.success("Image downloaded successfully");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Failed to download image");
    }
  };

  const positionLabels: Record<ViewPosition, string> = {
    "front": "Front View",
    "right-front": "Right Front View",
    "right-side": "Right Side View",
    "right-rear": "Right Rear View",
    "rear": "Rear View",
    "left-rear": "Left Rear View",
    "left-side": "Left Side View",
    "left-front": "Left Front View",
  };

  const positions: ViewPosition[] = [
    "front",
    "right-front",
    "right-side",
    "right-rear",
    "rear",
    "left-rear",
    "left-side",
    "left-front",
  ];

  // Count completed photos
  const completedPhotos = positions.filter(pos => getPhotoPath(pos) !== null).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>360° View</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedPhotos} of 8 photos
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vehicle diagram */}
        <div className="relative w-full aspect-video border rounded-md bg-muted/30">
          {/* Car outline */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1/2 h-1/3 border-2 border-muted-foreground/50 rounded-lg"></div>
          </div>

          {/* Position buttons */}
          <Button
            variant={activePosition === "front" ? "default" : "outline"}
            size="sm"
            className={cn(
              "absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2",
              getPhotoPath("front") && "ring-2 ring-green-500"
            )}
            onClick={() => setActivePosition("front")}
          >
            Front
          </Button>

          <Button
            variant={activePosition === "right-front" ? "default" : "outline"}
            size="sm"
            className={cn(
              "absolute top-1/3 left-[60%]",
              getPhotoPath("right-front") && "ring-2 ring-green-500"
            )}
            onClick={() => setActivePosition("right-front")}
          >
            RF
          </Button>

          <Button
            variant={activePosition === "right-side" ? "default" : "outline"}
            size="sm"
            className={cn(
              "absolute top-1/2 left-[65%] -translate-y-1/2",
              getPhotoPath("right-side") && "ring-2 ring-green-500"
            )}
            onClick={() => setActivePosition("right-side")}
          >
            RS
          </Button>

          <Button
            variant={activePosition === "right-rear" ? "default" : "outline"}
            size="sm"
            className={cn(
              "absolute top-2/3 left-[60%]",
              getPhotoPath("right-rear") && "ring-2 ring-green-500"
            )}
            onClick={() => setActivePosition("right-rear")}
          >
            RR
          </Button>

          <Button
            variant={activePosition === "rear" ? "default" : "outline"}
            size="sm"
            className={cn(
              "absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2",
              getPhotoPath("rear") && "ring-2 ring-green-500"
            )}
            onClick={() => setActivePosition("rear")}
          >
            Rear
          </Button>

          <Button
            variant={activePosition === "left-rear" ? "default" : "outline"}
            size="sm"
            className={cn(
              "absolute top-2/3 left-[40%]",
              getPhotoPath("left-rear") && "ring-2 ring-green-500"
            )}
            onClick={() => setActivePosition("left-rear")}
          >
            LR
          </Button>

          <Button
            variant={activePosition === "left-side" ? "default" : "outline"}
            size="sm"
            className={cn(
              "absolute top-1/2 left-[35%] -translate-y-1/2",
              getPhotoPath("left-side") && "ring-2 ring-green-500"
            )}
            onClick={() => setActivePosition("left-side")}
          >
            LS
          </Button>

          <Button
            variant={activePosition === "left-front" ? "default" : "outline"}
            size="sm"
            className={cn(
              "absolute top-1/3 left-[40%]",
              getPhotoPath("left-front") && "ring-2 ring-green-500"
            )}
            onClick={() => setActivePosition("left-front")}
          >
            LF
          </Button>
        </div>

        {/* Selected position details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{positionLabels[activePosition]}</Label>
          </div>

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
                <AlertDialogAction onClick={handleRemovePhoto}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {getPhotoPath(activePosition) ? (
            <div className="relative rounded-md overflow-hidden border border-border">
              <ImagePreviewWrapper
                bucketName="claim-attachments"
                filePath={getPhotoPath(activePosition)!}
                alt={positionLabels[activePosition]}
              >
                <div className="w-full h-64 relative">
                  <StorageImage
                    bucketName="claim-attachments"
                    filePath={getPhotoPath(activePosition)}
                    alt={positionLabels[activePosition]}
                    fill
                    sizes="(max-width: 768px) 100vw, 800px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </ImagePreviewWrapper>

              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-background/80 hover:bg-background"
                  onClick={handleDownload}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setIsDeleteDialogOpen(true)}
                  title="Delete"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="gap-1"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </div>

              {selectedFile && (
                <div className="p-2 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {(selectedFile.size / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive">{error.message}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
