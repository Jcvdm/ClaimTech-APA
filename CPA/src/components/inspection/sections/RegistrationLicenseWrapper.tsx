"use client";

import React from 'react';
import { RegistrationSection } from './RegistrationSection';
import { LicenseDiscSection } from './LicenseDiscSection';

interface RegistrationLicenseWrapperProps {
  claimId: string;
  inspectionId: string;
  // Registration props
  registrationNumber: string | null;
  registrationPhotoPath: string | null;
  onRegistrationNumberChange: (registrationNumber: string) => void;
  onRegistrationPhotoPathChange: (path: string | null) => void;
  // License disc props
  licenseDiscPresent: boolean;
  licenseDiscExpiry: string | null;
  licenseDiscPhotoPath: string | null;
  onLicenseDiscPresentChange: (present: boolean) => void;
  onLicenseDiscExpiryChange: (expiry: string | null) => void;
  onLicenseDiscPhotoPathChange: (path: string | null) => void;
}

export function RegistrationLicenseWrapper({
  claimId,
  inspectionId,
  // Registration props
  registrationNumber,
  registrationPhotoPath,
  onRegistrationNumberChange,
  onRegistrationPhotoPathChange,
  // License disc props
  licenseDiscPresent,
  licenseDiscExpiry,
  licenseDiscPhotoPath,
  onLicenseDiscPresentChange,
  onLicenseDiscExpiryChange,
  onLicenseDiscPhotoPathChange
}: RegistrationLicenseWrapperProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Registration Section */}
      <RegistrationSection
        claimId={claimId}
        inspectionId={inspectionId}
        registrationNumber={registrationNumber}
        registrationPhotoPath={registrationPhotoPath}
        onRegistrationNumberChange={onRegistrationNumberChange}
        onRegistrationPhotoPathChange={onRegistrationPhotoPathChange}
      />
      
      {/* License Disc Section */}
      <LicenseDiscSection
        claimId={claimId}
        inspectionId={inspectionId}
        licenseDiscPresent={licenseDiscPresent}
        licenseDiscExpiry={licenseDiscExpiry}
        licenseDiscPhotoPath={licenseDiscPhotoPath}
        onLicenseDiscPresentChange={onLicenseDiscPresentChange}
        onLicenseDiscExpiryChange={onLicenseDiscExpiryChange}
        onLicenseDiscPhotoPathChange={onLicenseDiscPhotoPathChange}
      />
    </div>
  );
}
