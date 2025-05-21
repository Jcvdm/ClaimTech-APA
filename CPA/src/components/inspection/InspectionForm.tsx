"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegistrationDetails } from "./RegistrationDetails";
import { LicenseDiscDetails } from "./LicenseDiscDetails";
import { VinDetails } from "./VinDetails";
import { ThreeSixtyView } from "./ThreeSixtyView";
import { useCreateInspection } from "@/lib/api/domains/inspections/hooks";
import { type Inspection } from "@/lib/api/domains/inspections/types";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";

interface InspectionFormProps {
  claimId: string;
  vehicleId: string;
  existingInspection?: Inspection;
}

export function InspectionForm({
  claimId,
  vehicleId,
  existingInspection,
}: InspectionFormProps) {
  const router = useRouter();
  const createInspection = useCreateInspection();
  const [activeTab, setActiveTab] = useState("registration");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    // Registration details
    registrationNumber: existingInspection?.registration_number || "",
    registrationPhotoPath: existingInspection?.registration_photo_path || null,
    
    // License disc details
    licenseDiscPresent: existingInspection?.license_disc_present || false,
    licenseDiscExpiry: existingInspection?.license_disc_expiry || null,
    licenseDiscPhotoPath: existingInspection?.license_disc_photo_path || null,
    
    // VIN details
    vinNumber: existingInspection?.vin_number || "",
    vinDashPhotoPath: existingInspection?.vin_dash_photo_path || null,
    vinPlatePhotoPath: existingInspection?.vin_plate_photo_path || null,
    vinNumberPhotoPath: existingInspection?.vin_number_photo_path || null,
    
    // 360 view photos
    frontViewPhotoPath: existingInspection?.front_view_photo_path || null,
    rightFrontViewPhotoPath: existingInspection?.right_front_view_photo_path || null,
    rightSideViewPhotoPath: existingInspection?.right_side_view_photo_path || null,
    rightRearViewPhotoPath: existingInspection?.right_rear_view_photo_path || null,
    rearViewPhotoPath: existingInspection?.rear_view_photo_path || null,
    leftRearViewPhotoPath: existingInspection?.left_rear_view_photo_path || null,
    leftSideViewPhotoPath: existingInspection?.left_side_view_photo_path || null,
    leftFrontViewPhotoPath: existingInspection?.left_front_view_photo_path || null,
    
    // Notes
    notes: existingInspection?.notes || "",
  });
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      await createInspection.mutateAsync({
        claim_id: claimId,
        vehicle_id: vehicleId,
        
        // Registration details
        registration_number: formData.registrationNumber || undefined,
        registration_photo_path: formData.registrationPhotoPath || undefined,
        
        // License disc details
        license_disc_present: formData.licenseDiscPresent,
        license_disc_expiry: formData.licenseDiscExpiry || undefined,
        license_disc_photo_path: formData.licenseDiscPhotoPath || undefined,
        
        // VIN details
        vin_number: formData.vinNumber || undefined,
        vin_dash_photo_path: formData.vinDashPhotoPath || undefined,
        vin_plate_photo_path: formData.vinPlatePhotoPath || undefined,
        vin_number_photo_path: formData.vinNumberPhotoPath || undefined,
        
        // 360 view photos
        front_view_photo_path: formData.frontViewPhotoPath || undefined,
        right_front_view_photo_path: formData.rightFrontViewPhotoPath || undefined,
        right_side_view_photo_path: formData.rightSideViewPhotoPath || undefined,
        right_rear_view_photo_path: formData.rightRearViewPhotoPath || undefined,
        rear_view_photo_path: formData.rearViewPhotoPath || undefined,
        left_rear_view_photo_path: formData.leftRearViewPhotoPath || undefined,
        left_side_view_photo_path: formData.leftSideViewPhotoPath || undefined,
        left_front_view_photo_path: formData.leftFrontViewPhotoPath || undefined,
        
        // Notes
        notes: formData.notes || undefined,
      });
      
      toast.success("Inspection saved successfully");
      router.push(`/claims/${claimId}`);
    } catch (error) {
      console.error("Error saving inspection:", error);
      toast.error("Failed to save inspection");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          className="gap-1"
          onClick={() => router.push(`/claims/${claimId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Claim
        </Button>
        
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="gap-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Inspection</span>
            </>
          )}
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="registration">Registration</TabsTrigger>
          <TabsTrigger value="license">License Disc</TabsTrigger>
          <TabsTrigger value="vin">VIN Details</TabsTrigger>
          <TabsTrigger value="360">360° View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="registration">
          <RegistrationDetails
            claimId={claimId}
            inspectionId={existingInspection?.id || "new"}
            registrationNumber={formData.registrationNumber}
            registrationPhotoPath={formData.registrationPhotoPath}
            onRegistrationNumberChange={(value) => 
              setFormData((prev) => ({ ...prev, registrationNumber: value }))
            }
            onRegistrationPhotoPathChange={(path) => 
              setFormData((prev) => ({ ...prev, registrationPhotoPath: path }))
            }
            existingInspection={existingInspection}
          />
        </TabsContent>
        
        <TabsContent value="license">
          <LicenseDiscDetails
            claimId={claimId}
            inspectionId={existingInspection?.id || "new"}
            licenseDiscPresent={formData.licenseDiscPresent}
            licenseDiscExpiry={formData.licenseDiscExpiry}
            licenseDiscPhotoPath={formData.licenseDiscPhotoPath}
            onLicenseDiscPresentChange={(value) => 
              setFormData((prev) => ({ ...prev, licenseDiscPresent: value }))
            }
            onLicenseDiscExpiryChange={(date) => 
              setFormData((prev) => ({ ...prev, licenseDiscExpiry: date }))
            }
            onLicenseDiscPhotoPathChange={(path) => 
              setFormData((prev) => ({ ...prev, licenseDiscPhotoPath: path }))
            }
            existingInspection={existingInspection}
          />
        </TabsContent>
        
        <TabsContent value="vin">
          <VinDetails
            claimId={claimId}
            inspectionId={existingInspection?.id || "new"}
            vinNumber={formData.vinNumber}
            vinDashPhotoPath={formData.vinDashPhotoPath}
            vinPlatePhotoPath={formData.vinPlatePhotoPath}
            vinNumberPhotoPath={formData.vinNumberPhotoPath}
            onVinNumberChange={(value) => 
              setFormData((prev) => ({ ...prev, vinNumber: value }))
            }
            onVinDashPhotoPathChange={(path) => 
              setFormData((prev) => ({ ...prev, vinDashPhotoPath: path }))
            }
            onVinPlatePhotoPathChange={(path) => 
              setFormData((prev) => ({ ...prev, vinPlatePhotoPath: path }))
            }
            onVinNumberPhotoPathChange={(path) => 
              setFormData((prev) => ({ ...prev, vinNumberPhotoPath: path }))
            }
            existingInspection={existingInspection}
          />
        </TabsContent>
        
        <TabsContent value="360">
          <div className="space-y-6">
            <ThreeSixtyView
              claimId={claimId}
              inspectionId={existingInspection?.id || "new"}
              frontViewPhotoPath={formData.frontViewPhotoPath}
              rightFrontViewPhotoPath={formData.rightFrontViewPhotoPath}
              rightSideViewPhotoPath={formData.rightSideViewPhotoPath}
              rightRearViewPhotoPath={formData.rightRearViewPhotoPath}
              rearViewPhotoPath={formData.rearViewPhotoPath}
              leftRearViewPhotoPath={formData.leftRearViewPhotoPath}
              leftSideViewPhotoPath={formData.leftSideViewPhotoPath}
              leftFrontViewPhotoPath={formData.leftFrontViewPhotoPath}
              onFrontViewPhotoPathChange={(path) => 
                setFormData((prev) => ({ ...prev, frontViewPhotoPath: path }))
              }
              onRightFrontViewPhotoPathChange={(path) => 
                setFormData((prev) => ({ ...prev, rightFrontViewPhotoPath: path }))
              }
              onRightSideViewPhotoPathChange={(path) => 
                setFormData((prev) => ({ ...prev, rightSideViewPhotoPath: path }))
              }
              onRightRearViewPhotoPathChange={(path) => 
                setFormData((prev) => ({ ...prev, rightRearViewPhotoPath: path }))
              }
              onRearViewPhotoPathChange={(path) => 
                setFormData((prev) => ({ ...prev, rearViewPhotoPath: path }))
              }
              onLeftRearViewPhotoPathChange={(path) => 
                setFormData((prev) => ({ ...prev, leftRearViewPhotoPath: path }))
              }
              onLeftSideViewPhotoPathChange={(path) => 
                setFormData((prev) => ({ ...prev, leftSideViewPhotoPath: path }))
              }
              onLeftFrontViewPhotoPathChange={(path) => 
                setFormData((prev) => ({ ...prev, leftFrontViewPhotoPath: path }))
              }
              existingInspection={existingInspection}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter any additional notes about the vehicle inspection"
                    rows={4}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="gap-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save Inspection</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
