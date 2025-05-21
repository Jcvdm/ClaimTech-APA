import { z } from "zod";
import { ClaimInstruction } from "@/lib/api/domains/claims";

// Define the form schema with Zod
export const formSchema = z.object({
  // Claim Information Tab
  client_id: z.string().uuid({
    message: "Please select a client",
  }),
  client_reference: z.string().optional().nullable(),
  policy_number: z.string().optional().nullable(),

  instruction: z.nativeEnum(ClaimInstruction, {
    message: "Please select an instruction type",
  }),
  date_of_loss: z.date({
    required_error: "Please select a date of loss",
  }),
  time_of_loss: z.string({
    required_error: "Please enter a time of loss",
  }).regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Please select a time or use HH:MM format"),
  type_of_loss: z.enum([
    "Accident",
    "Theft",
    "Fire",
    "Flood",
    "Hail",
    "Vandalism",
    "Other"
  ]).optional().nullable(),
  accident_description: z.string().optional(),

  // Claims Handler Information
  claims_handler_name: z.string().optional().nullable(),
  claims_handler_contact: z.string().optional().nullable(),
  claims_handler_email: z.string().email("Invalid email address").optional().nullable(),

  // Vehicle Owner Details Tab
  party_type: z.enum(["Insured", "Third Party"]).default("Insured").optional(),
  owner_name: z.string().min(1, "Owner name is required"),
  owner_contact: z.string().min(1, "Owner contact is required"),
  owner_email: z.string().email("Invalid email address").optional().nullable(),
  owner_alt_phone: z.string().optional().nullable(),
  owner_address: z.string().optional().nullable(),
  insured_name: z.string().optional().nullable(),
  client_special_instructions: z.string().optional().nullable(),

  // Vehicle Details Tab
  make: z.string().min(1, "Vehicle make is required"),
  model: z.string().optional(),
  year: z.number().int().positive()
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear(), "Year cannot be in the future")
    .optional()
    .nullable()
    .transform(val => val === 0 ? undefined : val),
  color: z.string().optional(),
  registration_number: z.string().optional(),
  vin: z.string().optional(),
  engine_number: z.string().optional(),
  transmission_type: z.string().optional().nullable(),
  drive_type: z.string().optional().nullable(),
  fuel_type: z.string().optional().nullable(),
  license_disk_expiry: z.date().optional().nullable(),
  license_disk_present: z.boolean().optional().nullable(),
  has_lettering: z.boolean().optional().nullable(),
  has_trim_mouldings: z.boolean().optional().nullable(),

  // Location Details Tab
  claim_location: z.string().optional().nullable(),
  province_id: z.string().uuid().optional().nullable(),

  // Adjuster Assignment Tab
  assigned_to_employee_id: z.string().uuid().optional().nullable(),
}).superRefine((data, ctx) => {
  // Ensure at least one vehicle identifier is provided
  if (!data.registration_number && !data.vin && !data.engine_number) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one vehicle identifier is required. Please provide Registration Number, VIN, or Engine Number.",
      path: ["registration_number"],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one vehicle identifier is required. Please provide Registration Number, VIN, or Engine Number.",
      path: ["vin"],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one vehicle identifier is required. Please provide Registration Number, VIN, or Engine Number.",
      path: ["engine_number"],
    });
  }

  // Validate date of loss is not in the future
  if (data.date_of_loss && data.date_of_loss > new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Date of loss cannot be in the future",
      path: ["date_of_loss"],
    });
  }
});

// Infer the form values type from the schema
export type FormValues = z.infer<typeof formSchema>;

// Default form values
export const defaultFormValues: Partial<FormValues> = {
  // Claim Information Tab
  client_id: "",
  client_reference: "",
  policy_number: "",

  instruction: ClaimInstruction.AGREE_ONLY,
  date_of_loss: undefined,
  time_of_loss: "12:00", // Default to noon
  type_of_loss: undefined,
  accident_description: "",

  // Claims Handler Information
  claims_handler_name: "",
  claims_handler_contact: "",
  claims_handler_email: "",

  // Vehicle Owner Details Tab
  party_type: "Insured",
  owner_name: "",
  owner_contact: "",
  owner_email: "",
  owner_alt_phone: "",
  owner_address: "",
  insured_name: "",
  client_special_instructions: "",

  // Vehicle Details Tab
  make: "",
  model: "",
  year: new Date().getFullYear(), // Set default to current year
  color: "",
  registration_number: "",
  vin: "",
  engine_number: "",
  // Fields below will be captured during vehicle inspection
  transmission_type: undefined,
  drive_type: undefined,
  fuel_type: undefined,
  license_disk_expiry: undefined,
  license_disk_present: undefined,
  has_lettering: undefined,
  has_trim_mouldings: undefined,

  // Location Details Tab
  claim_location: "",
  province_id: undefined,

  // Adjuster Assignment Tab
  assigned_to_employee_id: undefined,
};

// Tab validation fields mapping
export const tabValidationFields = {
  "claim-info": ["client_id", "instruction", "date_of_loss", "time_of_loss"],
  "owner-details": ["owner_name", "owner_contact"],
  "vehicle-details": ["make"],
  "location-details": [],
  "adjuster-details": []
};
