import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Shield, Key, Check, LogOut, ExternalLink, HardDrive } from 'lucide-react'
import { useClerk, useUser } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../../../components/Header/Header'
import { useAppStore } from '../../../store/useAppStore'

export function ProfilePage() {
  const navigate = useNavigate()
  const { signOut } = useClerk()
  const { user: clerkUser } = useUser()
  const { user: storeUser, logout, notebooks } = useAppStore()

  const [copiedWs, setCopiedWs] = useState(false)

  const realEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    storeUser?.email ||
    'user@chaibook.ai'

  const realName =
    clerkUser?.fullName ||
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
    storeUser?.name ||
    'ChaiBook User'

  const initials = realName?.charAt(0).toUpperCase() || 'U'
  const workspaceId = storeUser?.workspaceId || 'default'

  const handleCopyWs = async () => {
    try {
      await navigator.clipboard.writeText(workspaceId)
      setCopiedWs(true)
      setTimeout(() => setCopiedWs(false), 2000)
    } catch {}
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch {}
    logout()
    navigate('/')
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg dark:bg-bg-dark">
      <Header title="User Profile" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8 space-y-6">
          {/* Identity Header Card */}
          <section className="p-6 rounded-card bg-card dark:bg-card-dark border border-border dark:border-border-dark flex flex-col sm:flex-row items-center sm:items-start gap-5 relative overflow-hidden">
            <div className="w-16 h-16 rounded-2xl bg-[#5B46F6] text-white flex items-center justify-center font-bold text-2xl shadow-lg shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-xl font-bold text-text-primary dark:text-text-primary-dark truncate">
                  {realName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  Active Member
                </span>
              </div>
              <p className="text-sm text-text-muted dark:text-text-muted-dark mt-1 truncate">
                {realEmail}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" /> Clerk Authenticated
                </span>
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-indigo-500" /> {notebooks.length} Notebooks
                </span>
              </div>
            </div>
          </section>

          {/* Account Details Section */}
          <section className="p-6 rounded-card bg-card dark:bg-card-dark border border-border dark:border-border-dark space-y-5">
            <h2 className="text-sm font-bold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Account Details
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={realName}
                    className="w-full px-3.5 py-2.5 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-xl text-sm font-medium text-text-primary dark:text-text-primary-dark"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1.5">
                  Primary Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    readOnly
                    value={realEmail}
                    className="w-full px-3.5 py-2.5 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-xl text-sm font-medium text-text-primary dark:text-text-primary-dark pl-9"
                  />
                  <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-1.5">
                  Workspace ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={workspaceId}
                    className="flex-1 px-3.5 py-2.5 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-xl text-xs font-mono text-text-primary dark:text-text-primary-dark"
                  />
                  <button
                    onClick={handleCopyWs}
                    className="px-4 py-2.5 rounded-xl border border-border dark:border-border-dark hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-medium transition-colors"
                  >
                    {copiedWs ? <Check className="w-4 h-4 text-emerald-500" /> : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Preferences & Security Card */}
          <section className="p-6 rounded-card bg-card dark:bg-card-dark border border-border dark:border-border-dark space-y-4">
            <h2 className="text-sm font-bold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              Security & Preferences
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
              <div>
                <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                  Application Settings
                </p>
                <p className="text-xs text-text-muted">
                  Manage theme appearance, notifications, and export data.
                </p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/20 transition-all"
              >
                Go to Settings <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* Sign Out Card */}
          <div className="flex justify-end pt-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleSignOut}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-sm font-semibold border border-red-200 dark:border-red-900/50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
