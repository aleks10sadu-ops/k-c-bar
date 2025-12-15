import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase URL and Key are required. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
  }

  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(url, key)
  }

  return supabaseClient
}
