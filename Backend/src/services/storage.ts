import crypto from 'crypto';
import path from 'path';
import axios from 'axios';
import { getSupabase } from './supabase';
import { config } from '../config';
import { FileTooLargeError, StorageError, ValidationError } from '../types/errors';

const getExtension = (filename: string): string => {
  return path.extname(filename).replace('.', '').toLowerCase();
};

export interface UploadOriginalImageParams {
  artisanId: string;
  productId: string;
  imageId: string;
  fileContent: Buffer;
  contentType: string;
  extension: string;
}

export interface UploadEnhancedImageParams {
  artisanId: string;
  productId: string;
  imageId: string;
  fileContent: Buffer;
  contentType?: string;
  extension?: string;
}

/**
 * Uploads original product photo to:
 * products/{artisanId}/{productId}/original/{imageId}.{ext}
 */
export const uploadOriginalProductImage = async (
  params: UploadOriginalImageParams
): Promise<string> => {
  const { artisanId, productId, imageId, fileContent, contentType, extension } = params;
  const storagePath = `products/${artisanId}/${productId}/original/${imageId}.${extension}`;
  const bucket = config.STORAGE_BUCKET_PRODUCTS;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileContent, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Original image upload failed for product ${productId}:`, error);
    throw new StorageError(`Original image upload failed: ${error instanceof Error ? error.message : error}`);
  }
};

/**
 * Uploads enhanced product photo to:
 * products/{artisanId}/{productId}/enhanced/{imageId}.jpg
 */
export const uploadEnhancedProductImage = async (
  params: UploadEnhancedImageParams
): Promise<string> => {
  const { artisanId, productId, imageId, fileContent, contentType = 'image/jpeg', extension = 'jpg' } = params;
  const storagePath = `products/${artisanId}/${productId}/enhanced/${imageId}.${extension}`;
  const bucket = config.STORAGE_BUCKET_PRODUCTS;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileContent, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Enhanced image upload failed for product ${productId}:`, error);
    throw new StorageError(`Enhanced image upload failed: ${error instanceof Error ? error.message : error}`);
  }
};

/**
 * Legacy upload helper maintaining backward compatibility
 */
export const uploadProductImage = async (
  productId: string,
  fileContent: Buffer,
  filename: string,
  contentType: string
): Promise<string> => {
  const extension = getExtension(filename) || 'jpg';
  const storagePath = `products/${productId}/${crypto.randomUUID()}.${extension}`;
  const bucket = config.STORAGE_BUCKET_PRODUCTS;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileContent, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Image upload failed for product ${productId}:`, error);
    throw new StorageError(`Image upload failed: ${error instanceof Error ? error.message : error}`);
  }
};

export const uploadEnhancedImage = async (
  productId: string,
  fileContent: Buffer,
  contentType: string = 'image/jpeg',
  extension: string = 'jpg'
): Promise<string> => {
  const storagePath = `products/${productId}/enhanced/${crypto.randomUUID()}.${extension}`;
  const bucket = config.STORAGE_BUCKET_PRODUCTS;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileContent, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`Enhanced image upload failed for product ${productId}:`, error);
    throw new StorageError(`Enhanced image upload failed: ${error instanceof Error ? error.message : error}`);
  }
};

export const fetchImageBufferFromUrlOrStorage = async (url: string): Promise<{ content: Buffer; contentType: string }> => {
  const bucket = config.STORAGE_BUCKET_PRODUCTS;
  const bucketIdx = url.indexOf(bucket);
  
  if (bucketIdx !== -1) {
    const storagePath = url.substring(bucketIdx + bucket.length + 1);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage.from(bucket).download(storagePath);
      if (!error && data) {
        const buf = Buffer.from(await data.arrayBuffer());
        return { content: buf, contentType: data.type || 'image/jpeg' };
      }
    } catch (e) {
      console.warn('Supabase storage SDK download failed, falling back to HTTP fetch:', e);
    }
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30000,
      maxContentLength: config.MAX_IMAGE_SIZE_MB * 1024 * 1024,
    });

    const rawContentType = response.headers['content-type'];
    const contentType = typeof rawContentType === 'string' ? rawContentType.split(';')[0].trim() : 'image/jpeg';
    const content = Buffer.from(response.data);

    if (content.length > config.MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      throw new FileTooLargeError(config.MAX_IMAGE_SIZE_MB);
    }

    return { content, contentType };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new ValidationError(`Could not download image (HTTP ${error.response.status})`);
    }
    throw new ValidationError(`Could not retrieve image: ${error instanceof Error ? error.message : error}`);
  }
};

export const uploadVoiceRecording = async (
  productId: string,
  fileContent: Buffer,
  filename: string,
  contentType: string
): Promise<string> => {
  const extension = getExtension(filename) || 'webm';
  const storagePath = `voices/${productId}/${crypto.randomUUID()}.${extension}`;
  const bucket = config.STORAGE_BUCKET_VOICES;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileContent, {
        contentType,
        upsert: false,
      });

    if (error) throw error;

    return storagePath;
  } catch (error) {
    console.error(`Voice upload failed for product ${productId}:`, error);
    throw new StorageError(`Voice recording upload failed: ${error instanceof Error ? error.message : error}`);
  }
};

export const getSignedAudioUrl = async (
  storagePath: string,
  expiresIn: number = 3600
): Promise<string> => {
  const bucket = config.STORAGE_BUCKET_VOICES;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, expiresIn);

    if (error) throw error;
    if (!data?.signedUrl) {
      throw new Error('No signed URL returned from storage provider');
    }
    return data.signedUrl;
  } catch (error) {
    console.error(`Failed to create signed URL for ${storagePath}:`, error);
    throw new StorageError(`Failed to generate audio URL: ${error instanceof Error ? error.message : error}`);
  }
};

export const deleteFile = async (bucket: string, storagePath: string): Promise<void> => {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.storage.from(bucket).remove([storagePath]);
    if (error) throw error;
    console.log(`Deleted file from storage: ${bucket}/${storagePath}`);
  } catch (error) {
    console.warn(`Failed to delete file ${storagePath}:`, error);
  }
};

