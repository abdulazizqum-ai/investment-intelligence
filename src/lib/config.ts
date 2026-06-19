// Runtime configuration derived from Vite env vars.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

const flag = (import.meta.env.VITE_USE_SUPABASE ?? 'false').toString().toLowerCase();

/**
 * Supabase is only used when explicitly enabled AND a real anon key is present.
 * Otherwise the app runs entirely on the local mock engine + demo auth so the
 * MVP is functional offline before real integrations are wired.
 */
export const USE_SUPABASE =
  flag === 'true' &&
  SUPABASE_URL.startsWith('http') &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.startsWith('PASTE_');
