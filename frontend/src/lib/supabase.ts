// Supabase has been replaced by Clerk Authentication
export const supabase = null;
export const isSupabaseConfigured = false;
export function getRedirectURL() {
  return window.location.origin;
}
