
import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = 'https://wqxkdlcfwcuklpbznqbt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxeGtkbGNmd2N1a2xwYnpucWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxNDk1NTcsImV4cCI6MjA0ODcyNTU1N30.hPBPCa2vNqvL1rW7mWzYfT7SdqZP0TZjP7OwZj2P9-4'

let supabaseClient: any = null

export const getSupabaseClient = () => {
  if (typeof window === 'undefined') {
    return null
  }

  if (!supabaseClient) {
    supabaseClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  return supabaseClient
}

export default getSupabaseClient
