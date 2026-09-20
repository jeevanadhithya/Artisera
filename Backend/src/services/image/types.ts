import { z } from 'zod';

// ─── Gemini 2.5 Flash Response Schema ────────────────────────────────────────
export const ProductVisualInfoSchema = z.object({
  type: z.string().default('Artisan Product'),
  category: z.string().default('Handicraft'),
  craftType: z.string().default('Traditional Craft'),
  material: z.string().default('Natural Material'),
  colors: z.array(z.string()).default([]),
});

export const ImageQualityAnalysisSchema = z.object({
  background: z.string().default('Neutral'),
  lighting: z.string().default('Even'),
  exposure: z.string().default('Normal'),
  sharpness: z.string().default('Moderate'),
  composition: z.string().default('Centered'),
});

export const EnhancementOperationsSchema = z.object({
  backgroundCleanup: z.boolean().default(true),
  backgroundRemoval: z.boolean().default(false),
  brightnessCorrection: z.boolean().default(true),
  contrastAdjustment: z.boolean().default(true),
  whiteBalance: z.boolean().default(true),
  sharpening: z.boolean().default(true),
  noiseReduction: z.boolean().default(false),
  crop: z.boolean().default(true),
  centerProduct: z.boolean().default(true),
  resize: z.boolean().default(true),
  compression: z.boolean().default(true).optional(),
});

export const GeminiImageAnalysisSchema = z.object({
  product: ProductVisualInfoSchema,
  imageQuality: ImageQualityAnalysisSchema,
  enhancement: EnhancementOperationsSchema,
});

export type ProductVisualInfo = z.infer<typeof ProductVisualInfoSchema>;
export type ImageQualityAnalysis = z.infer<typeof ImageQualityAnalysisSchema>;
export type EnhancementOperations = z.infer<typeof EnhancementOperationsSchema>;
export type GeminiImageAnalysis = z.infer<typeof GeminiImageAnalysisSchema>;

// ─── Image Processing Interfaces ─────────────────────────────────────────────
export interface ProcessImageOptions {
  imageBytes: Buffer;
  contentType: string;
  operations: EnhancementOperations;
  maxDimension?: number;
  quality?: number;
  backgroundStyle?: 'warm_ivory' | 'pure_white' | 'earth_neutral' | 'transparent';
  addShadow?: boolean;
  aspectRatio?: '1:1' | '4:5' | '16:9' | 'original';
  shadowStrength?: number;
}

export interface ProcessedImageResult {
  content: Buffer;
  contentType: string;
  extension: string;
  width: number;
  height: number;
  fileSize: number;
  backgroundStyle?: string;
  aspectRatio?: string;
  shadowApplied?: boolean;
}

export interface EnhancementResult {
  imageId: string;
  originalImageUrl: string;
  enhancedImageUrl: string;
  selectedImageUrl?: string;
  status: 'completed' | 'failed';
  analysis: GeminiImageAnalysis;
  mimeType: string;
  fileSize: number;
  backgroundStyle?: string;
  aspectRatio?: string;
  shadowApplied?: boolean;
}
