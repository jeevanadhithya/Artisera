import axios from 'axios';
import { config } from '../config';
import { FileTooLargeError, InvalidFileTypeError, ValidationError } from '../types/errors';

let sharp: any = null;
try {
  const dynamicRequire = eval('require');
  sharp = dynamicRequire('sharp');
} catch (err) {
  console.warn('WARNING: Sharp library failed to load. Image enhancement will fall back to raw bytes.');
}

// Allowed Mime Types & extensions
const ALLOWED_IMAGE_MIME_TYPES: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};

const ALLOWED_AUDIO_MIME_TYPES: Record<string, string[]> = {
  'audio/mpeg': ['mp3'],
  'audio/mp3': ['mp3'],
  'audio/wav': ['wav'],
  'audio/x-wav': ['wav'],
  'audio/wave': ['wav'],
  'audio/mp4': ['m4a'],
  'audio/m4a': ['m4a'],
  'audio/x-m4a': ['m4a'],
  'audio/ogg': ['ogg'],
  'audio/webm': ['webm'],
  'video/webm': ['webm'], // web browser audio recordings can be sent as video/webm
};

export interface FileValidationResult {
  content: Buffer;
  contentType: string;
  extension: string;
}

export const detectImageExtension = (buffer: Buffer, mimetype?: string): { ext: string; contentType: string } => {
  if (buffer && buffer.length >= 2) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      return { ext: 'jpg', contentType: 'image/jpeg' };
    }
    if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { ext: 'png', contentType: 'image/png' };
    }
    if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      return { ext: 'webp', contentType: 'image/webp' };
    }
  }

  if (mimetype) {
    const cleanMime = mimetype.split(';')[0].trim().toLowerCase();
    if (cleanMime === 'image/jpeg' || cleanMime === 'image/jpg') return { ext: 'jpg', contentType: 'image/jpeg' };
    if (cleanMime === 'image/png') return { ext: 'png', contentType: 'image/png' };
    if (cleanMime === 'image/webp') return { ext: 'webp', contentType: 'image/webp' };
  }

  return { ext: 'jpg', contentType: 'image/jpeg' };
};

export const validateAndReadImage = async (
  file: Express.Multer.File
): Promise<FileValidationResult> => {
  const content = file.buffer;
  if (!content || content.length === 0) {
    throw new ValidationError('Uploaded file is empty');
  }

  if (content.length > config.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    throw new FileTooLargeError(config.MAX_IMAGE_SIZE_MB);
  }

  const { ext, contentType } = detectImageExtension(content, file.mimetype);

  return { content, contentType, extension: ext };
};

export const validateAndReadAudio = async (
  file: Express.Multer.File
): Promise<FileValidationResult> => {
  const filename = file.originalname || '';
  const ext = pathExtension(filename);

  const allowedAudioExts = ['mp3', 'wav', 'm4a', 'ogg', 'webm'];
  if (!allowedAudioExts.includes(ext)) {
    throw new InvalidFileTypeError(allowedAudioExts);
  }

  const contentType = file.mimetype ? file.mimetype.split(';')[0].trim().toLowerCase() : '';
  if (!ALLOWED_AUDIO_MIME_TYPES[contentType]) {
    throw new InvalidFileTypeError(Object.keys(ALLOWED_AUDIO_MIME_TYPES));
  }

  const content = file.buffer;
  if (!content || content.length === 0) {
    throw new ValidationError('Uploaded audio file is empty');
  }

  if (content.length > config.MAX_AUDIO_SIZE_MB * 1024 * 1024) {
    throw new FileTooLargeError(config.MAX_AUDIO_SIZE_MB);
  }

  return { content, contentType, extension: ext };
};

// ─── Professional E-Commerce Product Image Enhancement System Prompt ─────────
export const ECOMMERCE_PRODUCT_ENHANCEMENT_PROMPT = `
Professional E-Commerce Product Image Enhancement Prompt

Enhance the provided artisan product photograph into a professional, high-quality e-commerce product image suitable for online marketplaces, catalogs, websites, and product listings.

1. Product Preservation — Highest Priority
Treat the original product as the exact source of truth. Preserve the product with complete visual fidelity.
- Do not alter, redesign, reconstruct, or reinterpret the product.
- Preserve exact shape, proportions, dimensions, structure, orientation, and silhouette.
- Preserve all original colors, color gradients, patterns, motifs, embroidery, stitching, prints, textures, materials, fibers, finishes, decorations, ornaments, and craftsmanship details.
- Do not add, remove, replace, simplify, enhance, or invent any product details.
- The final product must remain recognizably identical to the original photograph. Only the photographic presentation should be improved.

2. Background Removal & Replacement
- Remove cluttered, distracting, messy, or unwanted background.
- Replace with a clean, minimal, neutral studio-style background (soft neutral white #FAFAFA, warm white, or light gray).
- Include a very subtle, soft natural contact shadow beneath the product to maintain realistic grounding.

3. Lighting & Exposure Enhancement
- Correct uneven or harsh lighting with soft, diffused studio-style lighting.
- Apply balanced contrast and recover subtle details in shadows and highlights.

4. Color Fidelity & Sharpness
- Maintain true product color accuracy and white balance without artificial over-saturation.
- Apply moderate, professional sharpening to edge definitions, embroidery, weave, and craft surface textures.

5. Product Positioning & Composition
- Center the product horizontally and vertically with clean, marketplace-ready framing.
`;

export * from './image/types';
export * from './image/geminiAnalysisProvider';
export * from './image/freeImageProcessingProvider';
export * from './image/imageEnhancementService';

import { ImageEnhancementService, imageEnhancementService } from './image/imageEnhancementService';
import { FreeImageProcessingProvider } from './image/freeImageProcessingProvider';
import { GeminiAnalysisProvider } from './image/geminiAnalysisProvider';

const freeProcessor = new FreeImageProcessingProvider();

export const enhanceImageBytes = async (
  imageBytes: Buffer,
  contentType: string
): Promise<{ content: Buffer; contentType: string; extension: string }> => {
  const result = await freeProcessor.processImage({
    imageBytes,
    contentType,
    operations: {
      backgroundCleanup: true,
      backgroundRemoval: false,
      brightnessCorrection: true,
      contrastAdjustment: true,
      whiteBalance: true,
      sharpening: true,
      noiseReduction: false,
      crop: true,
      centerProduct: true,
      resize: true,
      compression: true,
    },
  });

  return {
    content: result.content,
    contentType: result.contentType,
    extension: result.extension,
  };
};

export const fetchImageBytes = async (url: string): Promise<{ content: Buffer; contentType: string }> => {
  const { fetchImageBufferFromUrlOrStorage } = await import('./storage');
  return fetchImageBufferFromUrlOrStorage(url);
};

export const pathExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
};


