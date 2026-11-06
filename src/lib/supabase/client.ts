import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/config'

export function createClient() {
  return createBrowserClient<any>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  )
}
