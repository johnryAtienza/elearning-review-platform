import { createClient } from '@supabase/supabase-js'
import config from '@/config'

if (!config.supabase.url || !config.supabase.anonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Auth calls will fail. Set VITE_AUTH_PROVIDER=mock to use local mock data.'
  )
}

/**
 * Singleton Supabase client.
 * Import this anywhere you need to interact with Supabase directly.
 *
 * Configuration:
 *  - persistSession: true  — stores session in localStorage automatically
 *  - autoRefreshToken: true — silently refreshes the JWT before it expires
 *  - detectSessionInUrl: true — handles OAuth redirect callbacks
 */
export const supabase = createClient(config.supabase.url, config.supabase.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
