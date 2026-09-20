import sharp from 'sharp';

export interface CanvasOptions {
  canvasWidth?: number; // default 1200
  canvasHeight?: number; // default 1200
  backgroundColor?: { r: number; g: number; b: number; alpha?: number }; // default white {255, 255, 255}
  quality?: number; // default 92
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Scale and center product onto a standard e-commerce canvas (e.g. 1200x1200 clean white background).
 */
export async function placeOnEcommerceCanvas(
  inputBuffer: Buffer,
  options: CanvasOptions = {}
): Promise<Buffer> {
  const canvasWidth = options.canvasWidth ?? 1200;
  const canvasHeight = options.canvasHeight ?? 1200;
  const bgColor = options.backgroundColor ?? { r: 255, g: 255, b: 255 };

  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const prodW = metadata.width || 800;
  const prodH = metadata.height || 800;

  // Fit within 90% of the canvas to ensure clean breathing margin
  const maxAvailableW = Math.round(canvasWidth * 0.90);
  const maxAvailableH = Math.round(canvasHeight * 0.90);

  const scale = Math.min(maxAvailableW / prodW, maxAvailableH / prodH, 2.0);
  const targetW = Math.max(1, Math.round(prodW * scale));
  const targetH = Math.max(1, Math.round(prodH * scale));

  const resizedProduct = await sharp(inputBuffer)
    .resize(targetW, targetH, {
      fit: 'inside',
      kernel: sharp.kernel.lanczos3,
    })
    .toBuffer();

  const left = Math.round((canvasWidth - targetW) / 2);
  const top = Math.round((canvasHeight - targetH) / 2);

  // Composite product onto clean white studio background
  let compositePipeline = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background: bgColor,
    },
  }).composite([
    {
      input: resizedProduct,
      left,
      top,
    },
  ]);

  const format = options.format ?? 'jpeg';
  const quality = options.quality ?? 92;

  if (format === 'jpeg') {
    return compositePipeline.jpeg({ quality, progressive: true, chromaSubsampling: '4:4:4' }).toBuffer();
  } else if (format === 'webp') {
    return compositePipeline.webp({ quality, effort: 4 }).toBuffer();
  } else {
    return compositePipeline.png({ compressionLevel: 8 }).toBuffer();
  }
}
