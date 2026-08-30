import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';

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
    const client = getSupabase();
    const { error } = await client.from('artisans').select('id', { count: 'exact', head: true });
    if (error && error.code !== 'PGRST116') {
      console.log(`⚡ Supabase DB status: Reached ${config.SUPABASE_URL} (${error.message})`);
    } else {
      console.log(`✅ Supabase DB successfully connected & verified (${config.SUPABASE_URL})`);
    }
    return true;
  } catch (err: any) {
    console.warn(`⚠️ Supabase connection warning (${config.SUPABASE_URL}):`, err?.message || err);
    return false;
  }
};

