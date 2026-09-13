import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  name: z.string().trim().min(1, "Name is required.").max(80),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const elementSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "shape", "image"]),
  name: z.string().max(120),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  locked: z.boolean(),
  hidden: z.boolean(),
}).passthrough(); // type-specific fields (text/shape/image) are validated at the domain layer

const backgroundSchema = z.object({
  type: z.enum(["solid", "gradient", "image"]),
}).passthrough();

export const createDesignSchema = z.object({
  name: z.string().trim().min(1).max(120),
  formatId: z.string(),
  formatName: z.string(),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  templateId: z.string().optional(),
});

export const updateDesignSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
  favorite: z.boolean().optional(),
  folderId: z.string().nullable().optional(),
  document: z.object({
    elements: z.array(elementSchema).max(500, "A single design can hold up to 500 layers."),
    background: backgroundSchema,
  }).optional(),
});

export const exportDesignSchema = z.object({
  format: z.enum(["png", "jpg", "pdf", "svg"]),
  resolution: z.enum(["standard", "high"]).default("standard"),
  transparent: z.boolean().default(false),
  quality: z.number().min(0.1).max(1).default(0.92),
});

export const brandKitSchema = z.object({
  businessName: z.string().max(120).optional(),
  contactInfo: z.string().max(200).optional(),
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/).optional(),
  secondaryColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/).optional(),
  accentColor: z.string().regex(/^#([0-9A-Fa-f]{6})$/).optional(),
  headingFont: z.string().max(60).optional(),
  bodyFont: z.string().max(60).optional(),
});

export const checkoutSchema = z.object({
  plan: z.enum(["PRO", "BUSINESS"]),
  billingCycle: z.enum(["monthly", "yearly"]),
});

export const shareDesignSchema = z.object({
  visibility: z.enum(["PRIVATE", "LINK", "PUBLIC"]),
});
