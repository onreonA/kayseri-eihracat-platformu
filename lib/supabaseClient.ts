
import { createBrowserClient } from '@supabase/ssr'

// Always use hardcoded values for production deployment
const getSupabaseConfig = () => {
  const SUPABASE_URL = 'https://wqxkdlcfwcuklpbznqbt.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeGtkbGNmd2N1a2xwYnpucWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxNDk1NTcsImV4cCI6MjA0ODcyNTU1N30.hPBPCa2vNqvL1rW7mWzYfT7SdqZP0TZjP7OwZj2P9-4';

  console.log('🔗 Supabase config loaded:', {
    url: SUPABASE_URL.substring(0, 30) + '...',
    keySource: 'hardcoded',
    envVarsAvailable: false
  });

  return { SUPABASE_URL, SUPABASE_ANON_KEY };
};

let supabaseClient: any = null

export const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    console.log('🚫 Server-side detected, returning null');
    return null
  }

  if (!supabaseClient) {
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = getSupabaseConfig();
      supabaseClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase client created successfully');
    } catch (error) {
      console.error('❌ Supabase client creation failed:', error);
      return null;
    }
  }

  return supabaseClient
}

export default getSupabaseClient
