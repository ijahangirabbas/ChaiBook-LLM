import { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, MessageSquare, Database, Zap, FileText, FileCode, AlertCircle } from 'lucide-react'
import { AUTH_FEATURES } from '../../../lib/constants'
import { cn } from '../../../lib/utils'
import { supabase, isSupabaseConfigured, getRedirectURL } from '../../../lib/supabase'

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Shield,
  MessageSquare,
  Database,
  Zap,
}

export function LoginPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null)

  const handleGoogleLogin = async () => {
    setErrorMsg(null)
    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Supabase credentials are missing or unconfigured. Please set valid VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in your environment.')
      return
    }

    try {
      setLoadingProvider('google')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getRedirectURL()}/dashboard`,
        },
      })
      if (error) {
        setErrorMsg(`Google Auth Error: ${error.message}`)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to connect to Google OAuth')
    } finally {
      setLoadingProvider(null)
    }
  }

  const handleGithubLogin = async () => {
    setErrorMsg(null)
    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Supabase credentials are missing or unconfigured. Please set valid VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in your environment.')
      return
    }

    try {
      setLoadingProvider('github')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${getRedirectURL()}/dashboard`,
        },
      })
      if (error) {
        setErrorMsg(`GitHub Auth Error: ${error.message}`)
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to connect to GitHub OAuth')
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <div className="flex w-full h-screen overflow-hidden bg-gradient-to-br from-[#F4F6FF] via-[#F7F8FC] to-[#EEF1FF] dark:from-[#000000] dark:via-[#050510] dark:to-[#000000]">
      {/* ─── Left column ───────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] xl:w-[55%] p-10 xl:p-14 relative select-none">
        {/* Top Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-md">
            <span className="text-white text-xl">☕</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight text-text-primary dark:text-text-primary-dark">ChaiBook</span>
            <span className="text-2xl font-bold tracking-tight text-primary">LLM</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="my-auto max-w-xl">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-text-primary dark:text-text-primary-dark leading-[1.15] mb-2">
            Your AI Notebook.
          </h1>
          <h2 className="text-4xl xl:text-5xl font-extrabold text-primary leading-[1.15] mb-5">
            Powered by your sources.
          </h2>
          <p className="text-base xl:text-lg text-text-secondary dark:text-text-secondary-dark leading-relaxed mb-8 max-w-md">
            Chat with your documents, videos, web pages, subtitles and more.
            Get accurate answers with sources you can trust.
          </p>

          {/* Features list */}
          <div className="space-y-4">
            {AUTH_FEATURES.map((feat) => {
              const Icon = ICON_MAP[feat.icon] || Shield
              return (
                <div key={feat.id} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-text-primary dark:text-text-primary-dark leading-tight">
                      {feat.title}
                    </h3>
                    <p className="text-xs xl:text-sm text-text-secondary dark:text-text-secondary-dark leading-snug mt-0.5">
                      {feat.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom Floating Graphic with PDF, YouTube, Web Page, Text, SRT/VTT */}
        <div className="relative h-28 flex items-end">
          {/* Soft background wave glow */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-3xl blur-xl" />

          {/* Floating cards row */}
          <div className="relative z-10 flex flex-wrap items-center gap-2.5">
            {/* Coffee cup badge */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="flex items-center justify-center w-11 h-11 rounded-2xl bg-card dark:bg-card-dark shadow-card dark:shadow-card-dark border border-border dark:border-border-dark"
            >
              <span className="text-2xl">☕</span>
            </motion.div>

            {/* PDF Document badge */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card dark:bg-card-dark shadow-card dark:shadow-card-dark border border-border dark:border-border-dark text-xs font-semibold text-text-primary dark:text-text-primary-dark"
            >
              <div className="w-5 h-5 bg-red-500 rounded-md flex items-center justify-center shrink-0">
                <span className="text-white text-[8px] font-bold">PDF</span>
              </div>
              PDF Document
            </motion.div>

            {/* YouTube Video badge */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card dark:bg-card-dark shadow-card dark:shadow-card-dark border border-border dark:border-border-dark text-xs font-semibold text-text-primary dark:text-text-primary-dark"
            >
              <div className="w-5 h-5 bg-red-600 rounded-md flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                  <path d="M10 15l5.19-3L10 9v6zm11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
                </svg>
              </div>
              YouTube Video
            </motion.div>

            {/* Web Page badge */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card dark:bg-card-dark shadow-card dark:shadow-card-dark border border-border dark:border-border-dark text-xs font-semibold text-text-primary dark:text-text-primary-dark"
            >
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
              Web Page
            </motion.div>

            {/* Text File (.txt) badge */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card dark:bg-card-dark shadow-card dark:shadow-card-dark border border-border dark:border-border-dark text-xs font-semibold text-text-primary dark:text-text-primary-dark"
            >
              <div className="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center shrink-0">
                <FileText className="w-3 h-3 text-white" />
              </div>
              Text (.txt)
            </motion.div>

            {/* Subtitle (.srt / .vtt) badge */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4.0, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-card dark:bg-card-dark shadow-card dark:shadow-card-dark border border-border dark:border-border-dark text-xs font-semibold text-text-primary dark:text-text-primary-dark"
            >
              <div className="w-5 h-5 bg-purple-500 rounded-md flex items-center justify-center shrink-0">
                <FileCode className="w-3 h-3 text-white" />
              </div>
              Subtitles (.srt / .vtt)
            </motion.div>
          </div>
        </div>
      </div>

      {/* ─── Right column (Login Card) ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className={cn(
            'w-full max-w-lg bg-card dark:bg-card-dark',
            'rounded-[28px] shadow-2xl dark:shadow-modal-dark',
            'border border-border/80 dark:border-border-dark',
            'p-8 sm:p-11 flex flex-col justify-center'
          )}
        >
          {/* Top Tea Icon & Sparkling Decor */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-3xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                <span className="text-3xl">☕</span>
              </div>
              <span className="absolute -top-1 -right-1 text-primary text-sm font-bold">✨</span>
              <span className="absolute -bottom-1 -left-1 text-primary text-xs font-bold">✨</span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary dark:text-text-primary-dark tracking-tight mb-1.5">
              Welcome to ChaiBook LLM
            </h2>
            <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
              Your AI notebook for smarter learning and research.
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-600 dark:text-red-400 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            {/* Google Button */}
            <motion.button
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              disabled={loadingProvider !== null}
              className={cn(
                'w-full flex items-center justify-center gap-3.5 py-3.5 px-6 rounded-[20px]',
                'border border-border dark:border-border-dark',
                'bg-white dark:bg-white/5 text-base font-semibold text-text-primary dark:text-text-primary-dark',
                'hover:border-primary/40 hover:bg-gray-50/80 dark:hover:bg-white/10',
                'transition-all duration-200 shadow-sm disabled:opacity-50'
              )}
              aria-label="Continue with Google"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loadingProvider === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
            </motion.button>

            {/* GitHub Button */}
            <motion.button
              whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGithubLogin}
              disabled={loadingProvider !== null}
              className={cn(
                'w-full flex items-center justify-center gap-3.5 py-3.5 px-6 rounded-[20px]',
                'border border-border dark:border-border-dark',
                'bg-white dark:bg-white/5 text-base font-semibold text-text-primary dark:text-text-primary-dark',
                'hover:border-primary/40 hover:bg-gray-50/80 dark:hover:bg-white/10',
                'transition-all duration-200 shadow-sm disabled:opacity-50'
              )}
              aria-label="Continue with GitHub"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              {loadingProvider === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}
            </motion.button>

          </div>

          {/* Terms & Privacy */}
          <p className="text-center text-xs text-text-muted dark:text-text-muted-dark leading-relaxed mb-6">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary font-medium hover:underline">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-primary font-medium hover:underline">Privacy Policy</a>.
          </p>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-text-secondary dark:text-text-secondary-dark font-medium">
            New to ChaiBook LLM? Continue with Google or GitHub to create your account.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
