import crypto from 'crypto';
import path from 'path';
import { getSupabase } from './supabase';
import { config } from '../config';
import { StorageError } from '../types/errors';

const getExtension = (filename: string): string => {
  return path.extname(filename).replace('.', '').toLowerCase();
};

const buildStoragePath = (folder: string, productId: string, extension: string): string => {
  const uniqueName = `${crypto.randomUUID()}.${extension}`;
  return `${folder}/${productId}/${uniqueName}`;
};

export const uploadProductImage = async (
  productId: string,
  fileContent: Buffer,
  filename: string,
  contentType: string
): Promise<string> => {
  const extension = getExtension(filename);
  const storagePath = buildStoragePath('products', productId, extension);
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

export const uploadVoiceRecording = async (
  productId: string,
  fileContent: Buffer,
  filename: string,
  contentType: string
): Promise<string> => {
  const extension = getExtension(filename);
  const storagePath = buildStoragePath('voices', productId, extension);
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

    return storagePath; // private path, needs signed url to download
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
    // Non-fatal — log but do not rethrow
  }
};
