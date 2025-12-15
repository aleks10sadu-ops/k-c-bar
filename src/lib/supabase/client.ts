import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Если нет переменных окружения, возвращаем mock клиент
  if (!url || !key || url === 'https://your-project.supabase.co') {
    return createMockClient()
  }

  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(url, key)
  }

  return supabaseClient
}

// Mock клиент для демо-режима
function createMockClient() {
  const mockResponse = {
    data: null,
    error: { message: 'Demo mode', code: 'DEMO' },
    count: null,
    status: 200,
    statusText: 'OK',
  }

  const mockQuery = () => ({
    select: () => mockQuery(),
    insert: () => mockQuery(),
    update: () => mockQuery(),
    delete: () => mockQuery(),
    eq: () => mockQuery(),
    single: () => Promise.resolve(mockResponse),
    order: () => mockQuery(),
    then: (resolve: (value: typeof mockResponse) => void) => resolve(mockResponse),
  })

  return {
    from: () => mockQuery(),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
  } as unknown as ReturnType<typeof createBrowserClient<Database>>
}
