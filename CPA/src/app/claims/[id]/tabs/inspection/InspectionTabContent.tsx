"use client";

import { useState, useEffect, useRef } from "react";
import { useClaimFullDetails } from "@/lib/api/domains/claims/hooks";
import { useVehicle } from "@/lib/api/domains/vehicles/hooks";
import { useInspectionsByClaim, useCreateInspection } from "@/lib/api/domains/inspections/hooks";
import { useParams } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, Save, CheckCircle } from "lucide-react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { StatusBadge } from "@/components/inspection/StatusBadge";

// Import section components
import { InspectionHeader } from "@/components/inspection/sections/InspectionHeader";
import { RegistrationLicenseWrapper } from "@/components/inspection/sections/RegistrationLicenseWrapper";
import { VinSection } from "@/components/inspection/sections/VinSection";
import { ThreeSixtyViewSection } from "@/components/inspection/sections/ThreeSixtyViewSection";
import { InteriorSection } from "@/components/inspection/sections/InteriorSection";
import { MechanicalSection } from "@/components/inspection/sections/MechanicalSection";
import { TyresSection, type AdditionalTyre } from "@/components/inspection/sections/TyresSection";
import { NotesSection } from "@/components/inspection/sections/NotesSection";

interface InspectionTabContentProps {
  inspectionsData?: any[];
}

export default function InspectionTabContent({ inspectionsData = [] }: InspectionTabContentProps) {
  const params = useParams();
  const claimId = params.id as string;

  // Fetch data
  const { data: claim, isLoading: isLoadingClaim } = useClaimFullDetails(claimId);
  const { data: inspections } = useInspectionsByClaim(claimId, {
    initialData: inspectionsData
  });
  const { data: vehicle, isLoading: isLoadingVehicle } = useVehicle(claim?.vehicle_id || "");

  // Mutations
  const createInspection = useCreateInspection();

  // Default form state
  const defaultFormState = {
    // Inspection details
    inspectionDateTime: null as string | null,

    // Registration details
    registrationNumber: "",
    registrationPhotoPath: null as string | null,

    // License disc details
    licenseDiscPresent: false,
    licenseDiscExpiry: null as string | null,
    licenseDiscPhotoPath: null as string | null,

    // VIN details
    vinNumber: "",
    vinDashPhotoPath: null as string | null,
    vinPlatePhotoPath: null as string | null,
    vinNumberPhotoPath: null as string | null,

    // 360° view
    frontViewPhotoPath: null as string | null,
    rightFrontViewPhotoPath: null as string | null,
    rightSideViewPhotoPath: null as string | null,
    rightRearViewPhotoPath: null as string | null,
    rearViewPhotoPath: null as string | null,
    leftRearViewPhotoPath: null as string | null,
    leftSideViewPhotoPath: null as string | null,
    leftFrontViewPhotoPath: null as string | null,
    overallCondition: "good",

    // Interior section
    mileagePhotoPath: null as string | null,
    radioPresent: false,
    radioMake: "",
    radioModel: "",
    radioPhotoPath: null as string | null,
    gearType: "manual",
    interiorFrontPhotoPath: null as string | null,
    interiorRearPhotoPath: null as string | null,
    leatherSeats: false,
    interiorCondition: "no_damage",
    srsActivated: false,
    srsDamagePhotoPath1: null as string | null,
    srsDamagePhotoPath2: null as string | null,
    srsDamagePhotoPath3: null as string | null,
    srsDamagePhotoPath4: null as string | null,
    jackToolsPresent: false,
    jackToolsPhotoPath: null as string | null,

    // Mechanical section
    engineBayPhotoPath: null as string | null,
    batteryPhotoPath: null as string | null,
    mechanicalCondition: "working",
    electricalCondition: "working",

    // Tyres section - standard tyres
    tyreRfFacePhotoPath: null as string | null,
    tyreRfMeasurementPhotoPath: null as string | null,
    tyreRfTreadPhotoPath: null as string | null,
    tyreRfMake: "",
    tyreRfSize: "",
    tyreRfLoadSpeed: "",

    tyreRrFacePhotoPath: null as string | null,
    tyreRrMeasurementPhotoPath: null as string | null,
    tyreRrTreadPhotoPath: null as string | null,
    tyreRrMake: "",
    tyreRrSize: "",
    tyreRrLoadSpeed: "",

    tyreLrFacePhotoPath: null as string | null,
    tyreLrMeasurementPhotoPath: null as string | null,
    tyreLrTreadPhotoPath: null as string | null,
    tyreLrMake: "",
    tyreLrSize: "",
    tyreLrLoadSpeed: "",

    tyreLfFacePhotoPath: null as string | null,
    tyreLfMeasurementPhotoPath: null as string | null,
    tyreLfTreadPhotoPath: null as string | null,
    tyreLfMake: "",
    tyreLfSize: "",
    tyreLfLoadSpeed: "",

    tyreSpareFacePhotoPath: null as string | null,
    tyreSpareMeasurementPhotoPath: null as string | null,
    tyreSpareTreadPhotoPath: null as string | null,
    tyreSpareMake: "",
    tyreSparSize: "",
    tyreSparLoadSpeed: "",

    // Additional tyres for larger vehicles
    additionalTyres: [] as AdditionalTyre[],

    // Notes
    notes: ""
  };

  // Form persistence with auto-save
  const {
    formData,
    updateFormData,
    saveToServer,
    status,
    hasUnsavedChanges
  } = useFormPersistence(
    `inspection-${claimId}`,
    defaultFormState,
    async (data) => {
      if (!claim || !vehicle) return;

      const existingInspection = inspections?.[0];

      // Prepare the data for submission
      const submissionData = {
        claim_id: claimId,
        vehicle_id: vehicle.id,

        // Registration details
        registration_number: data.registrationNumber || undefined,
        registration_photo_path: data.registrationPhotoPath || undefined,

        // License disc details
        license_disc_present: data.licenseDiscPresent,
        license_disc_expiry: data.licenseDiscExpiry || undefined,
        license_disc_photo_path: data.licenseDiscPhotoPath || undefined,

        // VIN details
        vin_number: data.vinNumber || undefined,
        vin_dash_photo_path: data.vinDashPhotoPath || undefined,
        vin_plate_photo_path: data.vinPlatePhotoPath || undefined,
        vin_number_photo_path: data.vinNumberPhotoPath || undefined,

        // 360° view
        front_view_photo_path: data.frontViewPhotoPath || undefined,
        right_front_view_photo_path: data.rightFrontViewPhotoPath || undefined,
        right_side_view_photo_path: data.rightSideViewPhotoPath || undefined,
        right_rear_view_photo_path: data.rightRearViewPhotoPath || undefined,
        rear_view_photo_path: data.rearViewPhotoPath || undefined,
        left_rear_view_photo_path: data.leftRearViewPhotoPath || undefined,
        left_side_view_photo_path: data.leftSideViewPhotoPath || undefined,
        left_front_view_photo_path: data.leftFrontViewPhotoPath || undefined,
        overall_condition: data.overallCondition,

        // Interior section
        mileage_photo_path: data.mileagePhotoPath || undefined,
        radio_present: data.radioPresent,
        radio_make: data.radioPresent ? data.radioMake || undefined : undefined,
        radio_model: data.radioPresent ? data.radioModel || undefined : undefined,
        radio_photo_path: data.radioPresent ? data.radioPhotoPath || undefined : undefined,
        gear_type: data.gearType,
        interior_front_photo_path: data.interiorFrontPhotoPath || undefined,
        interior_rear_photo_path: data.interiorRearPhotoPath || undefined,
        leather_seats: data.leatherSeats,
        interior_condition: data.interiorCondition,
        srs_activated: data.srsActivated,
        srs_damage_photo_path_1: data.srsDamagePhotoPath1 || undefined,
        srs_damage_photo_path_2: data.srsDamagePhotoPath2 || undefined,
        srs_damage_photo_path_3: data.srsDamagePhotoPath3 || undefined,
        srs_damage_photo_path_4: data.srsDamagePhotoPath4 || undefined,
        jack_tools_present: data.jackToolsPresent,
        jack_tools_photo_path: data.jackToolsPhotoPath || undefined,

        // Mechanical section
        engine_bay_photo_path: data.engineBayPhotoPath || undefined,
        battery_photo_path: data.batteryPhotoPath || undefined,
        mechanical_condition: data.mechanicalCondition,
        electrical_condition: data.electricalCondition,

        // Tyres section - standard tyres
        tyre_rf_face_photo_path: data.tyreRfFacePhotoPath || undefined,
        tyre_rf_measurement_photo_path: data.tyreRfMeasurementPhotoPath || undefined,
        tyre_rf_tread_photo_path: data.tyreRfTreadPhotoPath || undefined,
        tyre_rf_make: data.tyreRfMake || undefined,
        tyre_rf_size: data.tyreRfSize || undefined,
        tyre_rf_load_speed: data.tyreRfLoadSpeed || undefined,

        tyre_rr_face_photo_path: data.tyreRrFacePhotoPath || undefined,
        tyre_rr_measurement_photo_path: data.tyreRrMeasurementPhotoPath || undefined,
        tyre_rr_tread_photo_path: data.tyreRrTreadPhotoPath || undefined,
        tyre_rr_make: data.tyreRrMake || undefined,
        tyre_rr_size: data.tyreRrSize || undefined,
        tyre_rr_load_speed: data.tyreRrLoadSpeed || undefined,

        tyre_lr_face_photo_path: data.tyreLrFacePhotoPath || undefined,
        tyre_lr_measurement_photo_path: data.tyreLrMeasurementPhotoPath || undefined,
        tyre_lr_tread_photo_path: data.tyreLrTreadPhotoPath || undefined,
        tyre_lr_make: data.tyreLrMake || undefined,
        tyre_lr_size: data.tyreLrSize || undefined,
        tyre_lr_load_speed: data.tyreLrLoadSpeed || undefined,

        tyre_lf_face_photo_path: data.tyreLfFacePhotoPath || undefined,
        tyre_lf_measurement_photo_path: data.tyreLfMeasurementPhotoPath || undefined,
        tyre_lf_tread_photo_path: data.tyreLfTreadPhotoPath || undefined,
        tyre_lf_make: data.tyreLfMake || undefined,
        tyre_lf_size: data.tyreLfSize || undefined,
        tyre_lf_load_speed: data.tyreLfLoadSpeed || undefined,

        tyre_spare_face_photo_path: data.tyreSpareFacePhotoPath || undefined,
        tyre_spare_measurement_photo_path: data.tyreSpareMeasurementPhotoPath || undefined,
        tyre_spare_tread_photo_path: data.tyreSpareTreadPhotoPath || undefined,
        tyre_spare_make: data.tyreSpareMake || undefined,
        tyre_spare_size: data.tyreSparSize || undefined,
        tyre_spare_load_speed: data.tyreSparLoadSpeed || undefined,

        // Additional tyres for larger vehicles
        additional_tyres: data.additionalTyres.length > 0 ? data.additionalTyres : undefined,

        // Notes
        notes: data.notes || undefined
      };

      // Save to server
      await createInspection.mutateAsync(submissionData);

      // Show success toast
      toast.success("Inspection saved successfully");
    }
  );

  // Initialize form data from existing inspection
  useEffect(() => {
    if (claim?.inspection_datetime) {
      updateFormData({ inspectionDateTime: claim.inspection_datetime });
    }

    const existingInspection = inspections?.[0];
    if (existingInspection) {
      updateFormData({
        // Registration details
        registrationNumber: existingInspection.registration_number || "",
        registrationPhotoPath: existingInspection.registration_photo_path,

        // License disc details
        licenseDiscPresent: existingInspection.license_disc_present || false,
        licenseDiscExpiry: existingInspection.license_disc_expiry,
        licenseDiscPhotoPath: existingInspection.license_disc_photo_path,

        // VIN details
        vinNumber: existingInspection.vin_number || "",
        vinDashPhotoPath: existingInspection.vin_dash_photo_path,
        vinPlatePhotoPath: existingInspection.vin_plate_photo_path,
        vinNumberPhotoPath: existingInspection.vin_number_photo_path,

        // 360° view
        frontViewPhotoPath: existingInspection.front_view_photo_path,
        rightFrontViewPhotoPath: existingInspection.right_front_view_photo_path,
        rightSideViewPhotoPath: existingInspection.right_side_view_photo_path,
        rightRearViewPhotoPath: existingInspection.right_rear_view_photo_path,
        rearViewPhotoPath: existingInspection.rear_view_photo_path,
        leftRearViewPhotoPath: existingInspection.left_rear_view_photo_path,
        leftSideViewPhotoPath: existingInspection.left_side_view_photo_path,
        leftFrontViewPhotoPath: existingInspection.left_front_view_photo_path,
        overallCondition: existingInspection.overall_condition || "good",

        // Interior section
        mileagePhotoPath: existingInspection.mileage_photo_path,
        radioPresent: existingInspection.radio_present || false,
        radioMake: existingInspection.radio_make || "",
        radioModel: existingInspection.radio_model || "",
        radioPhotoPath: existingInspection.radio_photo_path,
        gearType: existingInspection.gear_type || "manual",
        interiorFrontPhotoPath: existingInspection.interior_front_photo_path,
        interiorRearPhotoPath: existingInspection.interior_rear_photo_path,
        leatherSeats: existingInspection.leather_seats || false,
        interiorCondition: existingInspection.interior_condition || "no_damage",
        srsActivated: existingInspection.srs_activated || false,
        srsDamagePhotoPath1: existingInspection.srs_damage_photo_path_1,
        srsDamagePhotoPath2: existingInspection.srs_damage_photo_path_2,
        srsDamagePhotoPath3: existingInspection.srs_damage_photo_path_3,
        srsDamagePhotoPath4: existingInspection.srs_damage_photo_path_4,
        jackToolsPresent: existingInspection.jack_tools_present || false,
        jackToolsPhotoPath: existingInspection.jack_tools_photo_path,

        // Mechanical section
        engineBayPhotoPath: existingInspection.engine_bay_photo_path,
        batteryPhotoPath: existingInspection.battery_photo_path,
        mechanicalCondition: existingInspection.mechanical_condition || "working",
        electricalCondition: existingInspection.electrical_condition || "working",

        // Tyres section - standard tyres
        tyreRfFacePhotoPath: existingInspection.tyre_rf_face_photo_path,
        tyreRfMeasurementPhotoPath: existingInspection.tyre_rf_measurement_photo_path,
        tyreRfTreadPhotoPath: existingInspection.tyre_rf_tread_photo_path,
        tyreRfMake: existingInspection.tyre_rf_make || "",
        tyreRfSize: existingInspection.tyre_rf_size || "",
        tyreRfLoadSpeed: existingInspection.tyre_rf_load_speed || "",

        tyreRrFacePhotoPath: existingInspection.tyre_rr_face_photo_path,
        tyreRrMeasurementPhotoPath: existingInspection.tyre_rr_measurement_photo_path,
        tyreRrTreadPhotoPath: existingInspection.tyre_rr_tread_photo_path,
        tyreRrMake: existingInspection.tyre_rr_make || "",
        tyreRrSize: existingInspection.tyre_rr_size || "",
        tyreRrLoadSpeed: existingInspection.tyre_rr_load_speed || "",

        tyreLrFacePhotoPath: existingInspection.tyre_lr_face_photo_path,
        tyreLrMeasurementPhotoPath: existingInspection.tyre_lr_measurement_photo_path,
        tyreLrTreadPhotoPath: existingInspection.tyre_lr_tread_photo_path,
        tyreLrMake: existingInspection.tyre_lr_make || "",
        tyreLrSize: existingInspection.tyre_lr_size || "",
        tyreLrLoadSpeed: existingInspection.tyre_lr_load_speed || "",

        tyreLfFacePhotoPath: existingInspection.tyre_lf_face_photo_path,
        tyreLfMeasurementPhotoPath: existingInspection.tyre_lf_measurement_photo_path,
        tyreLfTreadPhotoPath: existingInspection.tyre_lf_tread_photo_path,
        tyreLfMake: existingInspection.tyre_lf_make || "",
        tyreLfSize: existingInspection.tyre_lf_size || "",
        tyreLfLoadSpeed: existingInspection.tyre_lf_load_speed || "",

        tyreSpareFacePhotoPath: existingInspection.tyre_spare_face_photo_path,
        tyreSpareMeasurementPhotoPath: existingInspection.tyre_spare_measurement_photo_path,
        tyreSpareTreadPhotoPath: existingInspection.tyre_spare_tread_photo_path,
        tyreSpareMake: existingInspection.tyre_spare_make || "",
        tyreSparSize: existingInspection.tyre_spare_size || "",
        tyreSparLoadSpeed: existingInspection.tyre_spare_load_speed || "",

        // Additional tyres for larger vehicles
        additionalTyres: existingInspection.additional_tyres || [],

        // Notes
        notes: existingInspection.notes || ""
      });
    }
  }, [claim?.inspection_datetime, inspections, updateFormData]);

  // Set up intersection observers for each section to prefetch data as user scrolls
  const registrationLicenseRef = useRef<HTMLDivElement>(null);
  const vinRef = useRef<HTMLDivElement>(null);
  const threeSixtyRef = useRef<HTMLDivElement>(null);
  const interiorRef = useRef<HTMLDivElement>(null);
  const mechanicalRef = useRef<HTMLDivElement>(null);
  const tyresRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);

  // Track which sections have been observed
  const [sectionsInView, setSectionsInView] = useState({
    registrationLicense: false,
    vin: false,
    threeSixty: false,
    interior: false,
    mechanical: false,
    tyres: false,
    notes: false
  });

  // Set up intersection observer
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '200px 0px',
      threshold: 0.1
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target;

          // Determine which section was observed
          if (target === registrationLicenseRef.current) {
            setSectionsInView(prev => ({ ...prev, registrationLicense: true }));
          } else if (target === vinRef.current) {
            setSectionsInView(prev => ({ ...prev, vin: true }));
          } else if (target === threeSixtyRef.current) {
            setSectionsInView(prev => ({ ...prev, threeSixty: true }));
          } else if (target === interiorRef.current) {
            setSectionsInView(prev => ({ ...prev, interior: true }));
          } else if (target === mechanicalRef.current) {
            setSectionsInView(prev => ({ ...prev, mechanical: true }));
          } else if (target === tyresRef.current) {
            setSectionsInView(prev => ({ ...prev, tyres: true }));
          } else if (target === notesRef.current) {
            setSectionsInView(prev => ({ ...prev, notes: true }));
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all section refs
    if (registrationLicenseRef.current) observer.observe(registrationLicenseRef.current);
    if (vinRef.current) observer.observe(vinRef.current);
    if (threeSixtyRef.current) observer.observe(threeSixtyRef.current);
    if (interiorRef.current) observer.observe(interiorRef.current);
    if (mechanicalRef.current) observer.observe(mechanicalRef.current);
    if (tyresRef.current) observer.observe(tyresRef.current);
    if (notesRef.current) observer.observe(notesRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);



  if (isLoadingClaim || isLoadingVehicle) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 text-primary animate-spin mr-2" />
        <span>Loading inspection data...</span>
      </div>
    );
  }

  if (!claim || !vehicle) {
    return <div>Claim or vehicle data not found</div>;
  }

  const existingInspection = inspections?.[0];
  const inspectionId = existingInspection?.id || "new";

  return (
    <div className="space-y-8">
      <ErrorBoundary fallback={<div>Error loading inspection header</div>}>
        <InspectionHeader
          claimId={claimId}
          claimStatus={claim.status}
          inspectionDateTime={formData.inspectionDateTime}
          onInspectionDateTimeChange={(dateTime) =>
            updateFormData({ inspectionDateTime: dateTime })
          }
        />
      </ErrorBoundary>

      <div ref={registrationLicenseRef}>
        <ErrorBoundary fallback={<div>Error loading registration and license disc details</div>}>
          <RegistrationLicenseWrapper
            claimId={claimId}
            inspectionId={inspectionId}
            registrationNumber={formData.registrationNumber}
            registrationPhotoPath={formData.registrationPhotoPath}
            onRegistrationNumberChange={(value) =>
              updateFormData({ registrationNumber: value })
            }
            onRegistrationPhotoPathChange={(path) =>
              updateFormData({ registrationPhotoPath: path })
            }
            licenseDiscPresent={formData.licenseDiscPresent}
            licenseDiscExpiry={formData.licenseDiscExpiry}
            licenseDiscPhotoPath={formData.licenseDiscPhotoPath}
            onLicenseDiscPresentChange={(value) =>
              updateFormData({ licenseDiscPresent: value })
            }
            onLicenseDiscExpiryChange={(value) =>
              updateFormData({ licenseDiscExpiry: value })
            }
            onLicenseDiscPhotoPathChange={(path) =>
              updateFormData({ licenseDiscPhotoPath: path })
            }
          />
        </ErrorBoundary>
      </div>

      <div ref={vinRef}>
        <ErrorBoundary fallback={<div>Error loading VIN details</div>}>
          <VinSection
            claimId={claimId}
            inspectionId={inspectionId}
            vehicleId={vehicle.id}
            vin={formData.vinNumber}
            vinDashPhotoPath={formData.vinDashPhotoPath}
            vinPlatePhotoPath={formData.vinPlatePhotoPath}
            vinNumberPhotoPath={formData.vinNumberPhotoPath}
            onVinChange={(value) =>
              updateFormData({ vinNumber: value })
            }
            onVinDashPhotoPathChange={(path) =>
              updateFormData({ vinDashPhotoPath: path })
            }
            onVinPlatePhotoPathChange={(path) =>
              updateFormData({ vinPlatePhotoPath: path })
            }
            onVinNumberPhotoPathChange={(path) =>
              updateFormData({ vinNumberPhotoPath: path })
            }
          />
        </ErrorBoundary>
      </div>

      <div ref={threeSixtyRef}>
        <ErrorBoundary fallback={<div>Error loading 360° view</div>}>
          <ThreeSixtyViewSection
            claimId={claimId}
            inspectionId={inspectionId}
            frontViewPhotoPath={formData.frontViewPhotoPath}
            rightFrontViewPhotoPath={formData.rightFrontViewPhotoPath}
            rightSideViewPhotoPath={formData.rightSideViewPhotoPath}
            rightRearViewPhotoPath={formData.rightRearViewPhotoPath}
            rearViewPhotoPath={formData.rearViewPhotoPath}
            leftRearViewPhotoPath={formData.leftRearViewPhotoPath}
            leftSideViewPhotoPath={formData.leftSideViewPhotoPath}
            leftFrontViewPhotoPath={formData.leftFrontViewPhotoPath}
            overallCondition={formData.overallCondition}
            onFrontViewPhotoPathChange={(path) =>
              updateFormData({ frontViewPhotoPath: path })
            }
            onRightFrontViewPhotoPathChange={(path) =>
              updateFormData({ rightFrontViewPhotoPath: path })
            }
            onRightSideViewPhotoPathChange={(path) =>
              updateFormData({ rightSideViewPhotoPath: path })
            }
            onRightRearViewPhotoPathChange={(path) =>
              updateFormData({ rightRearViewPhotoPath: path })
            }
            onRearViewPhotoPathChange={(path) =>
              updateFormData({ rearViewPhotoPath: path })
            }
            onLeftRearViewPhotoPathChange={(path) =>
              updateFormData({ leftRearViewPhotoPath: path })
            }
            onLeftSideViewPhotoPathChange={(path) =>
              updateFormData({ leftSideViewPhotoPath: path })
            }
            onLeftFrontViewPhotoPathChange={(path) =>
              updateFormData({ leftFrontViewPhotoPath: path })
            }
            onOverallConditionChange={(value) =>
              updateFormData({ overallCondition: value })
            }
          />
        </ErrorBoundary>
      </div>

      <div ref={interiorRef}>
        <ErrorBoundary fallback={<div>Error loading interior section</div>}>
          {sectionsInView.interior && (
            <InteriorSection
              claimId={claimId}
              inspectionId={inspectionId}
              mileagePhotoPath={formData.mileagePhotoPath}
              radioPresent={formData.radioPresent}
              radioMake={formData.radioMake}
              radioModel={formData.radioModel}
              radioPhotoPath={formData.radioPhotoPath}
              gearType={formData.gearType}
              interiorFrontPhotoPath={formData.interiorFrontPhotoPath}
              interiorRearPhotoPath={formData.interiorRearPhotoPath}
              leatherSeats={formData.leatherSeats}
              interiorCondition={formData.interiorCondition}
              srsActivated={formData.srsActivated}
              srsDamagePhotoPath1={formData.srsDamagePhotoPath1}
              srsDamagePhotoPath2={formData.srsDamagePhotoPath2}
              srsDamagePhotoPath3={formData.srsDamagePhotoPath3}
              srsDamagePhotoPath4={formData.srsDamagePhotoPath4}
              jackToolsPresent={formData.jackToolsPresent}
              jackToolsPhotoPath={formData.jackToolsPhotoPath}
              onMileagePhotoPathChange={(path) => updateFormData({ mileagePhotoPath: path })}
              onRadioPresentChange={(value) => updateFormData({ radioPresent: value })}
              onRadioMakeChange={(value) => updateFormData({ radioMake: value })}
              onRadioModelChange={(value) => updateFormData({ radioModel: value })}
              onRadioPhotoPathChange={(path) => updateFormData({ radioPhotoPath: path })}
              onGearTypeChange={(value) => updateFormData({ gearType: value })}
              onInteriorFrontPhotoPathChange={(path) => updateFormData({ interiorFrontPhotoPath: path })}
              onInteriorRearPhotoPathChange={(path) => updateFormData({ interiorRearPhotoPath: path })}
              onLeatherSeatsChange={(value) => updateFormData({ leatherSeats: value })}
              onInteriorConditionChange={(value) => updateFormData({ interiorCondition: value })}
              onSrsActivatedChange={(value) => updateFormData({ srsActivated: value })}
              onSrsDamagePhotoPath1Change={(path) => updateFormData({ srsDamagePhotoPath1: path })}
              onSrsDamagePhotoPath2Change={(path) => updateFormData({ srsDamagePhotoPath2: path })}
              onSrsDamagePhotoPath3Change={(path) => updateFormData({ srsDamagePhotoPath3: path })}
              onSrsDamagePhotoPath4Change={(path) => updateFormData({ srsDamagePhotoPath4: path })}
              onJackToolsPresentChange={(value) => updateFormData({ jackToolsPresent: value })}
              onJackToolsPhotoPathChange={(path) => updateFormData({ jackToolsPhotoPath: path })}
            />
          )}
        </ErrorBoundary>
      </div>

      <div ref={mechanicalRef}>
        <ErrorBoundary fallback={<div>Error loading mechanical section</div>}>
          {sectionsInView.mechanical && (
            <MechanicalSection
              claimId={claimId}
              inspectionId={inspectionId}
              engineBayPhotoPath={formData.engineBayPhotoPath}
              batteryPhotoPath={formData.batteryPhotoPath}
              mechanicalCondition={formData.mechanicalCondition}
              electricalCondition={formData.electricalCondition}
              onEngineBayPhotoPathChange={(path) => updateFormData({ engineBayPhotoPath: path })}
              onBatteryPhotoPathChange={(path) => updateFormData({ batteryPhotoPath: path })}
              onMechanicalConditionChange={(value) => updateFormData({ mechanicalCondition: value })}
              onElectricalConditionChange={(value) => updateFormData({ electricalCondition: value })}
            />
          )}
        </ErrorBoundary>
      </div>

      <div ref={tyresRef}>
        <ErrorBoundary fallback={<div>Error loading tyres section</div>}>
          {sectionsInView.tyres && (
            <TyresSection
              claimId={claimId}
              inspectionId={inspectionId}
              tyreData={{
                tyreRfFacePhotoPath: formData.tyreRfFacePhotoPath,
                tyreRfMeasurementPhotoPath: formData.tyreRfMeasurementPhotoPath,
                tyreRfTreadPhotoPath: formData.tyreRfTreadPhotoPath,
                tyreRfMake: formData.tyreRfMake,
                tyreRfSize: formData.tyreRfSize,
                tyreRfLoadSpeed: formData.tyreRfLoadSpeed,

                tyreRrFacePhotoPath: formData.tyreRrFacePhotoPath,
                tyreRrMeasurementPhotoPath: formData.tyreRrMeasurementPhotoPath,
                tyreRrTreadPhotoPath: formData.tyreRrTreadPhotoPath,
                tyreRrMake: formData.tyreRrMake,
                tyreRrSize: formData.tyreRrSize,
                tyreRrLoadSpeed: formData.tyreRrLoadSpeed,

                tyreLrFacePhotoPath: formData.tyreLrFacePhotoPath,
                tyreLrMeasurementPhotoPath: formData.tyreLrMeasurementPhotoPath,
                tyreLrTreadPhotoPath: formData.tyreLrTreadPhotoPath,
                tyreLrMake: formData.tyreLrMake,
                tyreLrSize: formData.tyreLrSize,
                tyreLrLoadSpeed: formData.tyreLrLoadSpeed,

                tyreLfFacePhotoPath: formData.tyreLfFacePhotoPath,
                tyreLfMeasurementPhotoPath: formData.tyreLfMeasurementPhotoPath,
                tyreLfTreadPhotoPath: formData.tyreLfTreadPhotoPath,
                tyreLfMake: formData.tyreLfMake,
                tyreLfSize: formData.tyreLfSize,
                tyreLfLoadSpeed: formData.tyreLfLoadSpeed,

                tyreSpareFacePhotoPath: formData.tyreSpareFacePhotoPath,
                tyreSpareMeasurementPhotoPath: formData.tyreSpareMeasurementPhotoPath,
                tyreSpareTreadPhotoPath: formData.tyreSpareTreadPhotoPath,
                tyreSpareMake: formData.tyreSpareMake,
                tyreSparSize: formData.tyreSparSize,
                tyreSparLoadSpeed: formData.tyreSparLoadSpeed
              }}
              onTyreDataChange={(updates) => updateFormData(updates)}
              additionalTyres={formData.additionalTyres}
              onAdditionalTyresChange={(tyres) => updateFormData({ additionalTyres: tyres })}
            />
          )}
        </ErrorBoundary>
      </div>

      <div ref={notesRef}>
        <ErrorBoundary fallback={<div>Error loading notes</div>}>
          <NotesSection
            notes={formData.notes}
            onNotesChange={(value) =>
              updateFormData({ notes: value })
            }
            onSubmit={saveToServer}
          />
        </ErrorBoundary>
      </div>

      <div className="flex justify-between items-center pb-8">
        <StatusBadge status={status} className="ml-2" />

        <Button
          onClick={saveToServer}
          disabled={status === 'saving' || !hasUnsavedChanges()}
          size="lg"
          className="gap-1"
        >
          {status === 'saving' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving to Server...</span>
            </>
          ) : status === 'saved' && !hasUnsavedChanges() ? (
            <>
              <CheckCircle className="h-4 w-4" />
              <span>All Changes Saved</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save to Server</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
