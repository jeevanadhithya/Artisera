import http from 'http';
import https from 'https';
import { config } from '../../config';
import { ProcessImageOptions, ProcessedImageResult } from './types';
import { ValidationError } from '../../types/errors';

let sharp: any = null;
try {
  const dynamicRequire = eval('require');
  sharp = dynamicRequire('sharp');
} catch (err) {
  console.warn('WARNING: Sharp library failed to load in FreeImageProcessingProvider.');
}

export class FreeImageProcessingProvider {
  /**
   * Attempts to offload processing to Python CV Worker if available.
   * Returns null if worker is not running or fails.
   */
  private async tryPythonWorker(options: ProcessImageOptions): Promise<ProcessedImageResult | null> {
    const workerUrl = process.env.CV_WORKER_URL || 'http://127.0.0.1:8001';
    
    try {
      const payload = JSON.stringify({
        image_base64: options.imageBytes.toString('base64'),
        background_style: options.backgroundStyle || 'warm_ivory',
        add_shadow: options.addShadow !== undefined ? options.addShadow : true,
        aspect_ratio: options.aspectRatio || '1:1',
        max_dimension: options.maxDimension || config.ENHANCE_MAX_DIMENSION || 1200,
        quality: options.quality || config.ENHANCE_JPEG_QUALITY || 92,
      });

      const url = new URL(`${workerUrl}/enhance`);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;

      return await new Promise((resolve) => {
        const req = transport.request(
          url,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            },
            timeout: 5000,
          },
          (res) => {
            if (res.statusCode !== 200) {
              resolve(null);
              return;
            }
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
              try {
                const parsed = JSON.parse(data);
                if (parsed.success && parsed.image_base64) {
                  const b64 = parsed.image_base64.includes(',') ? parsed.image_base64.split(',')[1] : parsed.image_base64;
                  const buf = Buffer.from(b64, 'base64');
                  resolve({
                    content: buf,
                    contentType: parsed.mime_type || 'image/jpeg',
                    extension: parsed.mime_type === 'image/png' ? 'png' : 'jpg',
                    width: parsed.width || 1200,
                    height: parsed.height || 1200,
                    fileSize: buf.length,
                    backgroundStyle: parsed.background_style,
                    aspectRatio: parsed.aspect_ratio,
                    shadowApplied: parsed.shadow_applied,
                  });
                } else {
                  resolve(null);
                }
              } catch (_) {
                resolve(null);
              }
            });
          }
        );

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });

        req.write(payload);
        req.end();
      });
    } catch (_) {
      return null;
    }
  }

  public async processImage(options: ProcessImageOptions): Promise<ProcessedImageResult> {
    if (!options.imageBytes || options.imageBytes.length === 0) {
      throw new ValidationError('No image data provided for enhancement processing.');
    }

    // 1. Check if external Python CV Worker is available and responsive
    const pythonResult = await this.tryPythonWorker(options);
    if (pythonResult) {
      return pythonResult;
    }

    // 2. Built-in Sharp Studio Pipeline (Guaranteed Fallback)
    if (!sharp) {
      throw new Error('Sharp image processing engine is not available on this server.');
    }

    const {
      imageBytes,
      operations,
      maxDimension = config.ENHANCE_MAX_DIMENSION || 1200,
      quality = config.ENHANCE_JPEG_QUALITY || 92,
      backgroundStyle = 'warm_ivory',
      addShadow = true,
      aspectRatio = '1:1',
    } = options;

    try {
      // 1. Initial metadata inspection & EXIF orientation normalization
      let pipeline = sharp(imageBytes, { failOn: 'none' }).rotate();
      const metadata = await pipeline.metadata();

      if (!metadata.width || !metadata.height) {
        throw new ValidationError('Could not decode uploaded image dimensions.');
      }

      // Studio background color mapping
      const bgColors: Record<string, { r: number; g: number; b: number }> = {
        warm_ivory: { r: 247, g: 243, b: 234 }, // #F7F3EA Artisera signature
        pure_white: { r: 255, g: 255, b: 255 }, // Standard white catalog
        earth_neutral: { r: 234, g: 230, b: 223 }, // #EAE6DF Organic neutral
      };
      const chosenBg = bgColors[backgroundStyle] || bgColors.warm_ivory;
      const isTransparent = backgroundStyle === 'transparent';

      // 2. Lighting & Exposure Balancing
      const brightnessMultiplier = operations.brightnessCorrection ? 1.05 : 1.0;
      const saturationMultiplier = operations.whiteBalance ? 1.04 : 1.0;
      pipeline = pipeline.modulate({
        brightness: brightnessMultiplier,
        saturation: saturationMultiplier,
      });

      // 3. Contrast & Exposure Optimization
      if (operations.contrastAdjustment) {
        pipeline = pipeline.linear(1.04, -4.0);
      }

      // 4. Noise Reduction
      if (operations.noiseReduction) {
        pipeline = pipeline.median(1);
      }

      // 5. Surface Texture Definition & Sharpening
      if (operations.sharpening) {
        pipeline = pipeline.sharpen({
          sigma: 0.9,
          m1: 0.8,
          m2: 1.8,
        });
      }

      // 6. Sizing & Canvas Aspect Ratio
      let targetW = maxDimension;
      let targetH = maxDimension;

      if (aspectRatio === '4:5') {
        targetW = Math.round(maxDimension * 0.8);
        targetH = maxDimension;
      } else if (aspectRatio === '16:9') {
        targetW = maxDimension;
        targetH = Math.round(maxDimension * (9 / 16));
      } else if (aspectRatio === 'original') {
        targetW = metadata.width;
        targetH = metadata.height;
      }

      if (isTransparent) {
        // Transparent PNG output
        pipeline = pipeline.resize({
          width: targetW,
          height: targetH,
          fit: 'inside',
          withoutEnlargement: true,
        });

        const enhancedBuffer = await pipeline
          .png({ compressionLevel: 8 })
          .toBuffer();

        const outMeta = await sharp(enhancedBuffer).metadata();
        return {
          content: enhancedBuffer,
          contentType: 'image/png',
          extension: 'png',
          width: outMeta.width || targetW,
          height: outMeta.height || targetH,
          fileSize: enhancedBuffer.length,
          backgroundStyle,
          aspectRatio,
          shadowApplied: false,
        };
      }

      // Opaque Studio Backdrop: Flatten and Pad onto chosen studio backdrop
      // Resize product to fit inside with 10% breathing margin
      const contentW = Math.round(targetW * 0.84);
      const contentH = Math.round(targetH * 0.84);

      // Render resized product buffer
      const productBuffer = await pipeline
        .resize({
          width: contentW,
          height: contentH,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer();

      const prodMeta = await sharp(productBuffer).metadata();
      const pW = prodMeta.width || contentW;
      const pH = prodMeta.height || contentH;
      const topOffset = Math.round((targetH - pH) / 2);
      const leftOffset = Math.round((targetW - pW) / 2);

      // Build composite layers
      const composites: any[] = [];

      // 7. Ground Contact Shadow Synthesis (if enabled)
      if (addShadow) {
        const shadowRx = Math.round(pW * 0.38);
        const shadowRy = Math.max(Math.round(pH * 0.05), 10);
        const shadowCx = leftOffset + Math.round(pW / 2);
        const shadowCy = Math.min(topOffset + pH - Math.round(shadowRy * 0.5), targetH - shadowRy);

        const shadowSvg = Buffer.from(
          `<svg width="${targetW}" height="${targetH}">
            <ellipse cx="${shadowCx}" cy="${shadowCy}" rx="${shadowRx}" ry="${shadowRy}" fill="rgba(48, 37, 31, 0.22)" filter="blur(7px)" />
          </svg>`
        );
        composites.push({ input: shadowSvg, top: 0, left: 0 });
      }

      // Place product foreground
      composites.push({ input: productBuffer, top: topOffset, left: leftOffset });

      // Create solid studio backdrop canvas and composite
      const enhancedBuffer = await sharp({
        create: {
          width: targetW,
          height: targetH,
          channels: 3,
          background: chosenBg,
        },
      })
        .composite(composites)
        .jpeg({
          quality: quality || 92,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();

      const outMeta = await sharp(enhancedBuffer).metadata();

      return {
        content: enhancedBuffer,
        contentType: 'image/jpeg',
        extension: 'jpg',
        width: outMeta.width || targetW,
        height: outMeta.height || targetH,
        fileSize: enhancedBuffer.length,
        backgroundStyle,
        aspectRatio,
        shadowApplied: addShadow,
      };
    } catch (error: any) {
      console.error('FreeImageProcessingProvider error:', error);
      throw new Error(`Pixel processing failed: ${error?.message || error}`);
    }
  }

  public async validateImage(buffer: Buffer): Promise<{ valid: boolean; width?: number; height?: number; format?: string; error?: string }> {
    if (!sharp) {
      return { valid: false, error: 'Sharp engine not available' };
    }
    if (!buffer || buffer.length === 0) {
      return { valid: false, error: 'Empty buffer' };
    }

    try {
      const meta = await sharp(buffer).metadata();
      if (!meta.width || !meta.height || meta.width <= 0 || meta.height <= 0) {
        return { valid: false, error: 'Invalid dimensions' };
      }
      return {
        valid: true,
        width: meta.width,
        height: meta.height,
        format: meta.format,
      };
    } catch (err: any) {
      return { valid: false, error: err?.message || 'Failed to inspect image' };
    }
  }
}
