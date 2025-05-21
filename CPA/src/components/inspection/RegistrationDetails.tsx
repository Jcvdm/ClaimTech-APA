"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useSupabaseStorage } from "@/hooks/useSupabaseStorage";
import { type Inspection } from "@/lib/api/domains/inspections/types";
import { StorageImage } from "@/components/ui/StorageImage";
import { ImagePreviewWrapper } from "@/components/ui/ImagePreviewWrapper";
import { toast } from "sonner";

interface RegistrationDetailsProps {
  claimId: string;
  inspectionId?: string;
  registrationNumber: string;
  registrationPhotoPath: string | null;
  onRegistrationNumberChange: (value: string) => void;
  onRegistrationPhotoPathChange: (path: string | null) => void;
  existingInspection?: Inspection;
}

export function RegistrationDetails({
  claimId,
  inspectionId = "new",
  registrationNumber,
  registrationPhotoPath,
  onRegistrationNumberChange,
  onRegistrationPhotoPathChange,
  existingInspection,
}: RegistrationDetailsProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadFile, isUploading, error } = useSupabaseStorage();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const path = `claims/${claimId}/inspections/${inspectionId}/registration`;
      const result = await uploadFile({
        bucketName: "claim-attachments",
        path,
        file: selectedFile,
      });

      if (result) {
        // Store the URL but prevent any automatic navigation
        onRegistrationPhotoPathChange(result);
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

  const handleRemovePhoto = () => {
    onRegistrationPhotoPathChange(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registration Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="registration-number">Registration Number</Label>
          <Input
            id="registration-number"
            value={registrationNumber}
            onChange={(e) => onRegistrationNumberChange(e.target.value)}
            placeholder="Enter vehicle registration number"
          />
        </div>

        <div className="space-y-2">
          <Label>Registration Photo</Label>

          {registrationPhotoPath ? (
            <div className="relative rounded-md overflow-hidden border border-border">
              <ImagePreviewWrapper
                bucketName="claim-attachments"
                filePath={registrationPhotoPath}
                alt="Registration"
              >
                <div className="w-full h-48 relative">
                  <StorageImage
                    bucketName="claim-attachments"
                    filePath={registrationPhotoPath}
                    alt="Registration"
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
                onClick={handleRemovePhoto}
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
