"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { type Inspection } from "@/lib/api/domains/inspections/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StorageImage } from "@/components/ui/StorageImage";
import { ImagePreviewWrapper } from "@/components/ui/ImagePreviewWrapper";
import { toast } from "sonner";

interface VinDetailsProps {
  claimId: string;
  inspectionId?: string;
  vinNumber: string;
  vinDashPhotoPath: string | null;
  vinPlatePhotoPath: string | null;
  vinNumberPhotoPath: string | null;
  onVinNumberChange: (value: string) => void;
  onVinDashPhotoPathChange: (path: string | null) => void;
  onVinPlatePhotoPathChange: (path: string | null) => void;
  onVinNumberPhotoPathChange: (path: string | null) => void;
  existingInspection?: Inspection;
}

export function VinDetails({
  claimId,
  inspectionId = "new",
  vinNumber,
  vinDashPhotoPath,
  vinPlatePhotoPath,
  vinNumberPhotoPath,
  onVinNumberChange,
  onVinDashPhotoPathChange,
  onVinPlatePhotoPathChange,
  onVinNumberPhotoPathChange,
  existingInspection,
}: VinDetailsProps) {
  const [activeTab, setActiveTab] = useState<string>("dash");
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({
    dash: null,
    plate: null,
    number: null,
  });

  const { uploadFile, isUploading, error } = useSupabaseStorage();

  const handleFileChange = (type: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles((prev) => ({
        ...prev,
        [type]: e.target.files![0],
      }));
    }
  };

  const handleUpload = async (type: string) => {
    const file = selectedFiles[type];
    if (!file) return;

    try {
      const path = `claims/${claimId}/inspections/${inspectionId}/vin/${type}`;
      const result = await uploadFile({
        bucketName: "claim-attachments",
        path,
        file,
      });

      if (result) {
        // Store the URL but prevent any automatic navigation
        if (type === "dash") {
          onVinDashPhotoPathChange(result);
        } else if (type === "plate") {
          onVinPlatePhotoPathChange(result);
        } else if (type === "number") {
          onVinNumberPhotoPathChange(result);
        }

        setSelectedFiles((prev) => ({
          ...prev,
          [type]: null,
        }));

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

  const handleRemovePhoto = (type: string) => {
    if (type === "dash") {
      onVinDashPhotoPathChange(null);
    } else if (type === "plate") {
      onVinPlatePhotoPathChange(null);
    } else if (type === "number") {
      onVinNumberPhotoPathChange(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>VIN Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="vin-number">VIN Number</Label>
          <Input
            id="vin-number"
            value={vinNumber}
            onChange={(e) => onVinNumberChange(e.target.value)}
            placeholder="Enter vehicle VIN number"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="dash">Dashboard</TabsTrigger>
            <TabsTrigger value="plate">VIN Plate</TabsTrigger>
            <TabsTrigger value="number">VIN Number</TabsTrigger>
          </TabsList>

          <TabsContent value="dash" className="space-y-4">
            <Label>Dashboard VIN Photo</Label>
            {vinDashPhotoPath ? (
              <div className="relative rounded-md overflow-hidden border border-border">
                <ImagePreviewWrapper
                  bucketName="claim-attachments"
                  filePath={vinDashPhotoPath}
                  alt="VIN Dashboard"
                >
                  <div className="w-full h-48 relative">
                    <StorageImage
                      bucketName="claim-attachments"
                      filePath={vinDashPhotoPath}
                      alt="VIN Dashboard"
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </ImagePreviewWrapper>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemovePhoto("dash")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange("dash")}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleUpload("dash")}
                    disabled={!selectedFiles.dash || isUploading}
                    className="gap-1"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </div>

                {selectedFiles.dash && (
                  <div className="p-2 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{selectedFiles.dash.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {(selectedFiles.dash.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="plate" className="space-y-4">
            <Label>VIN Plate Photo</Label>
            {vinPlatePhotoPath ? (
              <div className="relative rounded-md overflow-hidden border border-border">
                <ImagePreviewWrapper
                  bucketName="claim-attachments"
                  filePath={vinPlatePhotoPath}
                  alt="VIN Plate"
                >
                  <div className="w-full h-48 relative">
                    <StorageImage
                      bucketName="claim-attachments"
                      filePath={vinPlatePhotoPath}
                      alt="VIN Plate"
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </ImagePreviewWrapper>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemovePhoto("plate")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange("plate")}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleUpload("plate")}
                    disabled={!selectedFiles.plate || isUploading}
                    className="gap-1"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </div>

                {selectedFiles.plate && (
                  <div className="p-2 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{selectedFiles.plate.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {(selectedFiles.plate.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="number" className="space-y-4">
            <Label>VIN Number Photo</Label>
            {vinNumberPhotoPath ? (
              <div className="relative rounded-md overflow-hidden border border-border">
                <ImagePreviewWrapper
                  bucketName="claim-attachments"
                  filePath={vinNumberPhotoPath}
                  alt="VIN Number"
                >
                  <div className="w-full h-48 relative">
                    <StorageImage
                      bucketName="claim-attachments"
                      filePath={vinNumberPhotoPath}
                      alt="VIN Number"
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </ImagePreviewWrapper>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => handleRemovePhoto("number")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange("number")}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleUpload("number")}
                    disabled={!selectedFiles.number || isUploading}
                    className="gap-1"
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </div>

                {selectedFiles.number && (
                  <div className="p-2 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm truncate">{selectedFiles.number.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {(selectedFiles.number.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-sm text-destructive">{error.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
