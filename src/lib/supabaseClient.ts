import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL, USE_SUPABASE } from './config';

// Lazily create a single client only when Supabase is enabled & configured.
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!USE_SUPABASE) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
