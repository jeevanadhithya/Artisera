import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { getPool } from './db';

let supabaseClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseClient) {
    if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration is missing in environment variables.');
    }
    // Initialize Supabase Client with the service role key to bypass Row Level Security
    supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  }
  return supabaseClient;
};

export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW() as current_time;');
    if (result.rows.length > 0) {
      console.log(`✅ Database successfully connected & verified via DATABASE_URL`);
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn(`⚠️ Database connection warning via DATABASE_URL:`, err?.message || err);
    return false;
  }
};

