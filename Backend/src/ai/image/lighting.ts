import sharp from 'sharp';

export interface LightingOptions {
  lightingEnabled?: boolean;
  targetBrightness?: number; // default 110
  claheClipLimit?: number; // default 1.2
  claheTileSize?: number; // default 8
  gammaMin?: number; // default 0.85
  gammaMax?: number; // default 1.2
  whiteBalanceStrength?: number; // default 0.15
  sharpenEnabled?: boolean; // default true
  sharpenRadius?: number; // default 1.2
  sharpenFlat?: number; // default 0.8
  sharpenJagged?: number; // default 2.2
}

/**
 * Enhanced Lighting & Sharp-Edge Detail Optimizer.
 * Combines CLAHE Adaptive Histogram Contrast, Gray-World White Balance,
 * and Multi-Scale Unsharp Masking for studio-grade e-commerce clarity.
 */
export async function improveLighting(
  inputBuffer: Buffer,
  options: LightingOptions = {}
): Promise<Buffer> {
  const lightingEnabled = options.lightingEnabled ?? true;
  const whiteBalanceStrength = options.whiteBalanceStrength ?? 0.15;
  const sharpenEnabled = options.sharpenEnabled ?? true;

  let pipeline = sharp(inputBuffer);

  if (lightingEnabled) {
    // 1. Adaptive Contrast & Luminance Equalization (CLAHE)
    try {
      pipeline = pipeline.clahe({
        width: options.claheTileSize ?? 8,
        height: options.claheTileSize ?? 8,
        maxSlope: Math.round(options.claheClipLimit ?? 1.2),
      });
    } catch (_) {
      pipeline = pipeline.normalize();
    }

    // 2. Micro-Contrast & Natural Vibrant Handicraft Color Balancing
    pipeline = pipeline.modulate({
      brightness: 1.05,
      saturation: 1.08,
    });
  }

  // 3. Gray-World White Balance Correction
  if (whiteBalanceStrength > 0) {
    try {
      const stats = await sharp(inputBuffer).stats();
      const avgR = stats.channels[0]?.mean || 128;
      const avgG = stats.channels[1]?.mean || 128;
      const avgB = stats.channels[2]?.mean || 128;
      const gray = (avgR + avgG + avgB) / 3;

      if (gray > 0 && avgR > 0 && avgG > 0 && avgB > 0) {
        const multR = 1 + (gray / avgR - 1) * whiteBalanceStrength;
        const multG = 1 + (gray / avgG - 1) * whiteBalanceStrength;
        const multB = 1 + (gray / avgB - 1) * whiteBalanceStrength;

        pipeline = pipeline.recomb([
          [Math.min(1.25, Math.max(0.75, multR)), 0, 0],
          [0, Math.min(1.25, Math.max(0.75, multG)), 0],
          [0, 0, Math.min(1.25, Math.max(0.75, multB))],
        ]);
      }
    } catch (_) {}
  }

  // 4. Multi-Scale Sharp-Edge Crispness (Unsharp Mask)
  if (sharpenEnabled) {
    pipeline = pipeline.sharpen({
      sigma: options.sharpenRadius ?? 1.2,
      m1: options.sharpenFlat ?? 0.8,
      m2: options.sharpenJagged ?? 2.2,
    });
  }

  return pipeline.toBuffer();
}
