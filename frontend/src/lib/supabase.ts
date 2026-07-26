import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-supabase-project-id') &&
    !supabaseAnonKey.includes('your-supabase-anon-key')
)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

/**
 * Get dynamic redirect URL supporting both local dev and production deployment
 */
export const getRedirectURL = (): string => {
  let url =
    import.meta.env.VITE_SITE_URL ??
    import.meta.env.VITE_PUBLIC_SITE_URL ??
    window.location.origin

  // Make sure url starts with http / https
  url = url.startsWith('http') ? url : `https://${url}`
  // Trim trailing slash
  url = url.endsWith('/') ? url.slice(0, -1) : url
  return url
}
