import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { removeBackground } from './backgroundRemoval';
import { improveLighting, LightingOptions } from './lighting';
import { autoCrop, CropOptions } from './crop';
import { placeOnEcommerceCanvas, CanvasOptions } from './resize';

export interface ImageEnhancementOptions extends LightingOptions, CropOptions, CanvasOptions {
  outputFormat?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  maxInputSizeMb?: number;
}

export interface ImageEnhancementResult {
  success: boolean;
  buffer?: Buffer;
  outputPath?: string;
  url?: string;
  width: number;
  height: number;
  format: string;
  fileSize: number;
  processingStatus: 'completed' | 'failed';
  processingMetadata: {
    processingTimeMs: number;
    stepsApplied: string[];
    originalDimensions: { width: number; height: number };
    quality: number;
  };
  error?: string;
}

/**
 * Validate input image buffer or file path.
 */
export async function validateImage(
  input: Buffer | string,
  maxSizeMb: number = 25
): Promise<{ buffer: Buffer; metadata: sharp.Metadata }> {
  let buffer: Buffer;

  if (typeof input === 'string') {
    if (!fs.existsSync(input)) {
      throw new Error(`Input image file not found: ${input}`);
    }
    const stat = fs.statSync(input);
    if (stat.size > maxSizeMb * 1024 * 1024) {
      throw new Error(`Image size exceeds maximum allowed ${maxSizeMb} MB`);
    }
    buffer = fs.readFileSync(input);
  } else {
    buffer = input;
    if (buffer.length > maxSizeMb * 1024 * 1024) {
      throw new Error(`Image buffer exceeds maximum allowed ${maxSizeMb} MB`);
    }
  }

  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Could not decode valid image dimensions');
  }

  if (metadata.width < 50 || metadata.height < 50) {
    throw new Error(`Image dimensions too small: ${metadata.width}x${metadata.height}`);
  }

  return { buffer, metadata };
}

/**
 * Master service: enhanceProductImage
 * Coordinates the full 6-stage TypeScript enhancement pipeline:
 * Validation -> Background Removal -> Auto-Crop -> Lighting/CLAHE/Color-Balance -> E-commerce Canvas -> Format Optimization
 */
export async function enhanceProductImage(
  input: Buffer | string,
  outputPath?: string,
  options: ImageEnhancementOptions = {}
): Promise<ImageEnhancementResult> {
  const startTime = Date.now();
  const stepsApplied: string[] = [];

  try {
    // Stage 1: Validation
    stepsApplied.push('Validation & Metadata Extraction');
    const { buffer: initialBuffer, metadata } = await validateImage(
      input,
      options.maxInputSizeMb ?? 25
    );

    const originalDimensions = {
      width: metadata.width || 800,
      height: metadata.height || 800,
    };

    // Stage 2: Background Isolation
    stepsApplied.push('Background Segmentation & Isolation');
    const isolatedBuffer = await removeBackground(initialBuffer, {
      threshold: options.alphaThreshold,
    });

    // Stage 3: Auto-Crop & Subject Detection
    stepsApplied.push('Subject Detection & Margin Crop');
    const croppedBuffer = await autoCrop(isolatedBuffer, {
      cropPadding: options.cropPadding ?? 0.08,
    });

    // Stage 4: Lighting & CLAHE Contrast Enhancement
    stepsApplied.push('CLAHE Lighting & Color Balance');
    const litBuffer = await improveLighting(croppedBuffer, {
      lightingEnabled: options.lightingEnabled ?? true,
      whiteBalanceStrength: options.whiteBalanceStrength ?? 0.0,
      sharpenEnabled: options.sharpenEnabled ?? true,
    });

    // Stage 5: E-commerce Canvas Placement
    stepsApplied.push('1200x1200 Studio Canvas Placement');
    const targetFormat = options.outputFormat ?? 'jpeg';
    const targetQuality = options.quality ?? 92;

    const finalBuffer = await placeOnEcommerceCanvas(litBuffer, {
      canvasWidth: options.canvasWidth ?? 1200,
      canvasHeight: options.canvasHeight ?? 1200,
      backgroundColor: options.backgroundColor ?? { r: 255, g: 255, b: 255 },
      format: targetFormat,
      quality: targetQuality,
    });

    // Stage 6: Write to output path if specified
    if (outputPath) {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputPath, finalBuffer);
      stepsApplied.push('Filesystem Storage');
    }

    const finalMeta = await sharp(finalBuffer).metadata();
    const processingTimeMs = Date.now() - startTime;

    return {
      success: true,
      buffer: finalBuffer,
      outputPath,
      width: finalMeta.width || (options.canvasWidth ?? 1200),
      height: finalMeta.height || (options.canvasHeight ?? 1200),
      format: finalMeta.format || targetFormat,
      fileSize: finalBuffer.length,
      processingStatus: 'completed',
      processingMetadata: {
        processingTimeMs,
        stepsApplied,
        originalDimensions,
        quality: targetQuality,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      width: 0,
      height: 0,
      format: 'unknown',
      fileSize: 0,
      processingStatus: 'failed',
      processingMetadata: {
        processingTimeMs: Date.now() - startTime,
        stepsApplied,
        originalDimensions: { width: 0, height: 0 },
        quality: options.quality ?? 92,
      },
      error: err.message || 'Image enhancement failed',
    };
  }
}
