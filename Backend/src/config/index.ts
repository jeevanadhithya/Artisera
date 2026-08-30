import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from unified .env file
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface Config {
  PORT: number;
  ENVIRONMENT: string;
  
  // Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  DATABASE_URL: string;
  
  // AI
  LLM_PROVIDER: 'gemini' | 'qwen';
  VLLM_BASE_URL?: string;
  VLLM_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL: string;
  
  // Sarvam AI
  SARVAM_API_KEY?: string;
  SARVAM_BASE_URL: string;
  SARVAM_SPEECH_MODEL: string;
  SARVAM_SPEECH_MODE: string;
  SARVAM_TRANSLATION_MODEL: string;
  
  // Storage Buckets
  STORAGE_BUCKET_PRODUCTS: string;
  STORAGE_BUCKET_VOICES: string;
  
  // Image Enhancement
  ENHANCE_MAX_DIMENSION: number;
  ENHANCE_JPEG_QUALITY: number;
  ENHANCE_SHARPEN_AMOUNT: number;
  
  // File Limits
  MAX_IMAGE_SIZE_MB: number;
  MAX_AUDIO_SIZE_MB: number;
  
  // CORS
  CORS_ORIGINS: string[];
}

// Helper to parse comma-separated string to string array
const parseCorsOrigins = (originsStr?: string): string[] => {
  if (!originsStr) return ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080', 'https://artisera.vercel.app'];
  return originsStr.split(',').map(o => o.trim()).filter(Boolean);
};

export const config: Config = {
  PORT: parseInt(process.env.PORT || '8000', 10),
  ENVIRONMENT: process.env.ENVIRONMENT || 'development',
  
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://uxjgekvgaxrcvzhatzmt.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4amdla3ZnYXhyY3Z6aGF0em10Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzY2MzAwMywiZXhwIjoyMTAzMjM5MDAzfQ.lNXYGF54Mow6piIi_u40yJ6zdP-qJdj8LSt5sD1DbXU',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4amdla3ZnYXhyY3Z6aGF0em10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NjMwMDMsImV4cCI6MjEwMzIzOTAwM30.GrI3IQGRwqggD7Qj3DsJRSsyeoDMHLSzM1loTgaiUFI',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:live2kill%20L2K@db.uxjgekvgaxrcvzhatzmt.supabase.co:5432/postgres',
  
  LLM_PROVIDER: (process.env.LLM_PROVIDER === 'qwen' ? 'qwen' : 'gemini') as 'gemini' | 'qwen',
  VLLM_BASE_URL: process.env.VLLM_BASE_URL,
  VLLM_API_KEY: process.env.VLLM_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  
  SARVAM_API_KEY: process.env.SARVAM_API_KEY,
  SARVAM_BASE_URL: process.env.SARVAM_BASE_URL || 'https://api.sarvam.ai',
  SARVAM_SPEECH_MODEL: process.env.SARVAM_SPEECH_MODEL || 'saaras:v3',
  SARVAM_SPEECH_MODE: process.env.SARVAM_SPEECH_MODE || 'transcribe',
  SARVAM_TRANSLATION_MODEL: process.env.SARVAM_TRANSLATION_MODEL || 'mayura:v1',
  
  STORAGE_BUCKET_PRODUCTS: process.env.STORAGE_BUCKET_PRODUCTS || 'product-images',
  STORAGE_BUCKET_VOICES: process.env.STORAGE_BUCKET_VOICES || 'voice-recordings',
  
  ENHANCE_MAX_DIMENSION: parseInt(process.env.ENHANCE_MAX_DIMENSION || '1200', 10),
  ENHANCE_JPEG_QUALITY: parseInt(process.env.ENHANCE_JPEG_QUALITY || '92', 10),
  ENHANCE_SHARPEN_AMOUNT: parseFloat(process.env.ENHANCE_SHARPEN_AMOUNT || '1.2'),
  
  MAX_IMAGE_SIZE_MB: parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10),
  MAX_AUDIO_SIZE_MB: parseInt(process.env.MAX_AUDIO_SIZE_MB || '25', 10),
  
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGINS),
};

// Simple sanity check validation
if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment.');
}
