"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUploadCard } from '@/components/inspection/PhotoUploadCard';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';

interface LicenseDiscSectionProps {
  claimId: string;
  inspectionId: string;
  licenseDiscPresent: boolean;
  licenseDiscExpiry: string | null;
  licenseDiscPhotoPath: string | null;
  onLicenseDiscPresentChange: (present: boolean) => void;
  onLicenseDiscExpiryChange: (expiry: string | null) => void;
  onLicenseDiscPhotoPathChange: (path: string | null) => void;
}

export function LicenseDiscSection({
  claimId,
  inspectionId,
  licenseDiscPresent,
  licenseDiscExpiry,
  licenseDiscPhotoPath,
  onLicenseDiscPresentChange,
  onLicenseDiscExpiryChange,
  onLicenseDiscPhotoPathChange
}: LicenseDiscSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>License Disc</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="licenseDiscPresent"
            checked={licenseDiscPresent}
            onCheckedChange={onLicenseDiscPresentChange}
          />
          <Label htmlFor="licenseDiscPresent">License disc present</Label>
        </div>

        {licenseDiscPresent && (
          <div className="grid grid-cols-4 gap-4">
            {/* License Disc Expiry - spans 2 columns */}
            <div className="col-span-2 space-y-2">
              <Label htmlFor="licenseDiscExpiry">Expiry Date</Label>
              <DatePicker
                id="licenseDiscExpiry"
                date={licenseDiscExpiry ? new Date(licenseDiscExpiry) : undefined}
                onSelect={(date) => onLicenseDiscExpiryChange(date ? format(date, 'yyyy-MM-dd') : null)}
                placeholder="Select expiry date"
                className="w-full"
              />
            </div>

            {/* License Disc Photo - spans 2 columns */}
            <div className="col-span-2 space-y-2 h-44">
              <Label>License Disc Photo</Label>
              <div className="h-36">
                <PhotoUploadCard
                  title="License Disc Photo"
                  description="Photo of the vehicle's license disc"
                  imagePath={licenseDiscPhotoPath}
                  onImagePathChange={onLicenseDiscPhotoPathChange}
                  uploadPath={`claims/${claimId}/inspections/${inspectionId}/license-disc`}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
