import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Frontend] ⚠️ VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing in your environment.');
} else if (typeof window !== 'undefined') {
  console.log(`[Frontend] ✅ Supabase Client connected to ${supabaseUrl}`);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

