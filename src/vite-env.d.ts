/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_USE_SUPABASE: string;
  readonly VITE_FINNHUB_API_KEY: string;
  readonly VITE_USE_LIVE_DATA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
