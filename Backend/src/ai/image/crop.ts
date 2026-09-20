import sharp from 'sharp';

export interface CropOptions {
  cropPadding?: number; // default 0.08 (8%)
  alphaThreshold?: number; // default 30
}

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Detect product foreground bounding box from RGBA buffer and crop with proportional padding.
 */
export async function autoCrop(
  inputBuffer: Buffer,
  options: CropOptions = {}
): Promise<Buffer> {
  const paddingFraction = options.cropPadding ?? 0.08;
  const alphaThreshold = options.alphaThreshold ?? 30;

  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const imgWidth = metadata.width || 800;
  const imgHeight = metadata.height || 800;

  // Extract raw RGBA to detect non-transparent bounding box
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
  let foundForeground = false;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      const alpha = data[idx + 3];

      if (alpha > alphaThreshold) {
        foundForeground = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no alpha foreground detected, return input as-is or trimmed
  if (!foundForeground || minX >= maxX || minY >= maxY) {
    try {
      return await sharp(inputBuffer).trim().toBuffer();
    } catch (_) {
      return inputBuffer;
    }
  }

  const subjectWidth = maxX - minX + 1;
  const subjectHeight = maxY - minY + 1;

  // Add padding around subject
  const padReference = Math.max(subjectWidth, subjectHeight);
  const padPixels = Math.round(padReference * paddingFraction);

  const cropLeft = Math.max(0, minX - padPixels);
  const cropTop = Math.max(0, minY - padPixels);
  const cropWidth = Math.min(imgWidth - cropLeft, subjectWidth + padPixels * 2);
  const cropHeight = Math.min(imgHeight - cropTop, subjectHeight + padPixels * 2);

  return sharp(inputBuffer)
    .extract({
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight,
    })
    .toBuffer();
}
