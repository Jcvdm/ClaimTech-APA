// src/lib/api/domains/estimates/types.ts
import { z } from "zod";
import { type RouterOutputs, type RouterInputs } from "@/lib/api/types";

// Operation code enum
export enum OperationCode {
  NEW = "N",
  REPAIR = "R",
  ALIGN = "S",
  PAINT = "P",
  BLEND = "B",
  OTHER = "O",
  SPECIAL = "SC",
}

// Part type enum
export enum PartType {
  DEALER = "D",
  ALTERNATIVE = "ALT",
  USED = "U",
  OTHER = "O",
}

// Estimate status enum
export enum EstimateStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  APPROVED = "approved",
  REJECTED = "rejected",
  AUTHORIZED = "authorized",
}

// Estimate type enum
export enum EstimateType {
  INCIDENT = "incident",
  PRE_INCIDENT = "pre_incident",
  SUPPLEMENTARY = "supplementary",
}

// Estimate source enum
export enum EstimateSource {
  IN_HOUSE = "in_house",
  THIRD_PARTY = "third_party",
}

// Zod schema for estimate creation
export const EstimateCreateSchema = z.object({
  claim_id: z.string().uuid(),
  estimate_type: z.nativeEnum(EstimateType).default(EstimateType.INCIDENT),
  estimate_source: z.nativeEnum(EstimateSource).default(EstimateSource.IN_HOUSE),
  repairer_id: z.string().uuid().optional(),
  vat_rate_percentage: z.number().default(15), // Default VAT rate
  panel_labor_rate: z.number().optional(), // Single labor rate for all labor types
  part_markup_percentage: z.number().optional(),
  paint_material_rate: z.number().optional(), // Per panel rate
  special_markup_percentage: z.number().optional(), // New field for special markup
  notes: z.string().optional(),
});

// Zod schema for estimate output
export const EstimateOutputSchema = z.object({
  id: z.string().uuid(),
  claim_id: z.string().uuid(),
  estimate_number: z.string().nullable(),
  estimate_type: z.nativeEnum(EstimateType),
  estimate_source: z.nativeEnum(EstimateSource),
  status: z.nativeEnum(EstimateStatus),
  version: z.number(),
  repairer_id: z.string().uuid().nullable(),
  vat_rate_percentage: z.number(),
  panel_labor_rate: z.number().nullable(), // Single labor rate for all labor types
  part_markup_percentage: z.number().nullable(),
  paint_material_rate: z.number().nullable(), // Per panel rate
  special_markup_percentage: z.number().nullable(), // New field for special markup
  subtotal_parts: z.number().nullable(),
  subtotal_labor: z.number().nullable(),
  subtotal_paint_materials: z.number().nullable(),
  subtotal_sublet: z.number().nullable(),
  subtotal_other: z.number().nullable(),
  subtotal_special: z.number().nullable(), // New field for special services subtotal
  total_before_vat: z.number().nullable(),
  total_vat: z.number().nullable(),
  total_amount: z.number().nullable(),
  notes: z.string().nullable(),
  created_at: z.string().nullable().transform(val => val ? new Date(val) : null),
  updated_at: z.string().nullable().transform(val => val ? new Date(val) : null),
});

// Zod schema for estimate line creation
export const EstimateLineCreateSchema = z.object({
  estimate_id: z.string().uuid(),
  damage_id: z.string().uuid().nullable().optional(),
  sequence_number: z.number().int().positive(),
  description: z.string(), // Allow empty strings for description
  operation_code: z.nativeEnum(OperationCode),
  part_type: z.nativeEnum(PartType).nullable().optional(),
  part_number: z.string().nullable().optional(),
  part_cost: z.number().nonnegative().nullable().optional(),
  quantity: z.number().positive().default(1),
  strip_fit_hours: z.number().nonnegative().nullable().optional(),
  repair_hours: z.number().nonnegative().nullable().optional(),
  paint_hours: z.number().nonnegative().nullable().optional(),
  sublet_cost: z.number().nonnegative().nullable().optional(),
  is_included: z.boolean().default(true),
  line_notes: z.string().nullable().optional(),
});

// Zod schema for estimate line update
export const EstimateLineUpdateSchema = EstimateLineCreateSchema.partial().extend({
  id: z.string().uuid(),
});

// Zod schema for estimate line output
export const EstimateLineOutputSchema = z.object({
  id: z.string().uuid(),
  estimate_id: z.string().uuid(),
  damage_id: z.string().uuid().nullable(),
  sequence_number: z.number().int(),
  description: z.string(),
  operation_code: z.nativeEnum(OperationCode),
  part_type: z.nativeEnum(PartType).nullable(),
  part_number: z.string().nullable(),
  part_cost: z.number().nullable(),
  quantity: z.number(),
  strip_fit_hours: z.number().nullable(),
  repair_hours: z.number().nullable(),
  paint_hours: z.number().nullable(),
  sublet_cost: z.number().nullable(),
  is_included: z.boolean(),
  line_notes: z.string().nullable(),
  calculated_part_total: z.number().nullable(),
  calculated_labor_total: z.number().nullable(),
  calculated_paint_material_total: z.number().nullable(),
  calculated_sublet_total: z.number().nullable(),
  calculated_line_total: z.number().nullable(),
  created_at: z.string().nullable().transform(val => val ? new Date(val) : null),
  updated_at: z.string().nullable().transform(val => val ? new Date(val) : null),
});

// TypeScript types based on Zod schemas
export type EstimateCreate = z.infer<typeof EstimateCreateSchema>;
export type Estimate = z.infer<typeof EstimateOutputSchema>;
export type EstimateLineCreate = z.infer<typeof EstimateLineCreateSchema>;
export type EstimateLineUpdate = z.infer<typeof EstimateLineUpdateSchema>;
export type EstimateLine = z.infer<typeof EstimateLineOutputSchema>;

// Export types derived from tRPC
export type EstimateGetByClaimInput = RouterInputs["estimate"]["getByClaimId"];
export type EstimateGetByIdInput = RouterInputs["estimate"]["getById"];
export type EstimateLineGetByEstimateInput = RouterInputs["estimate"]["getLinesByEstimateId"];
