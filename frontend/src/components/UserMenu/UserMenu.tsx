import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Settings, User, X, Check, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'
import { useAppStore } from '../../store/useAppStore'
import { ApiService } from '../../services/api.service'
import { cn } from '../../lib/utils'

export function UserMenu() {
  const [open, setOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<'profile' | 'settings' | null>(null)
  const [notifications, setNotifications] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  const ref = useRef<HTMLDivElement>(null)
  const { user: storeUser, logout, theme } = useAppStore()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (err) {}
    logout()
    navigate('/')
  }

  useEffect(() => {
    if (activeModal !== 'settings') return
    ApiService.getSettings()
      .then((settings) => {
        setNotifications(settings.notificationsEnabled)
        if (settings.theme) {
          useAppStore.setState({ theme: settings.theme })
          if (settings.theme === 'dark') document.documentElement.classList.add('dark')
          else document.documentElement.classList.remove('dark')
        }
      })
      .catch(() => {})
  }, [activeModal])

  const applyTheme = (next: 'light' | 'dark') => {
    useAppStore.setState({ theme: next })
    if (next === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setSettingsError(null)
    try {
      await ApiService.updateSettings({ theme, notificationsEnabled: notifications })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const initials = realName?.charAt(0).toUpperCase() || 'M'

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="User menu"
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-full',
            'bg-[#5B46F6] text-white font-bold text-sm shrink-0',
            'hover:ring-2 hover:ring-primary/40 transition-all duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          )}
        >
          {initials}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={cn(
                'absolute right-0 top-12 z-50 w-60',
                'bg-card dark:bg-card-dark rounded-modal shadow-modal dark:shadow-modal-dark',
                'border border-border dark:border-border-dark overflow-hidden'
              )}
              role="menu"
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-border dark:border-border-dark">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#5B46F6] flex items-center justify-center text-white font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark truncate">
                      {realName}
                    </p>
                    <p className="text-xs text-text-muted dark:text-text-muted-dark truncate">
                      {realEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => {
                    setOpen(false)
                    setActiveModal('profile')
                  }}
                  role="menuitem"
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-sidebar-item text-sm',
                    'text-text-secondary dark:text-text-secondary-dark',
                    'hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10',
                    'transition-colors duration-150'
                  )}
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>

                <button
                  onClick={() => {
                    setOpen(false)
                    navigate('/settings')
                  }}
                  role="menuitem"
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-sidebar-item text-sm',
                    'text-text-secondary dark:text-text-secondary-dark',
                    'hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10',
                    'transition-colors duration-150'
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>

              <div className="border-t border-border dark:border-border-dark p-1.5">
                <button
                  onClick={handleLogout}
                  role="menuitem"
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-sidebar-item text-sm',
                    'text-danger hover:bg-danger/5',
                    'transition-colors duration-150'
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Profile & Settings Modal */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card dark:bg-card-dark border border-border dark:border-border-dark rounded-modal shadow-modal dark:shadow-modal-dark w-full max-w-md p-6 relative overflow-hidden"
            >
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {activeModal === 'profile' ? (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-[#5B46F6] text-white flex items-center justify-center font-bold text-lg">
                      {initials}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">User Profile</h3>
                      <p className="text-xs text-text-muted dark:text-text-muted-dark">Account overview and workspace role</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Full Name</label>
                      <input
                        type="text"
                        disabled
                        value={realName}
                        className="w-full px-3 py-2 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-md text-sm text-text-primary dark:text-text-primary-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Email Address</label>
                      <input
                        type="email"
                        disabled
                        value={realEmail}
                        className="w-full px-3 py-2 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-md text-sm text-text-primary dark:text-text-primary-dark"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase mb-1">Workspace ID</label>
                      <input
                        type="text"
                        disabled
                        value={storeUser?.workspaceId || 'default'}
                        className="w-full px-3 py-2 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-md text-sm text-text-primary font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => setActiveModal(null)}
                      className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">Settings</h3>
                      <p className="text-xs text-text-muted dark:text-text-muted-dark">Application preferences</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Theme</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => applyTheme('light')}
                          className={cn(
                            'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all',
                            theme === 'light'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border dark:border-border-dark text-text-secondary hover:border-primary/50'
                          )}
                        >
                          <Sun className="w-4 h-4" /> Light Mode
                        </button>
                        <button
                          onClick={() => applyTheme('dark')}
                          className={cn(
                            'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all',
                            theme === 'dark'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-border dark:border-border-dark text-text-secondary hover:border-primary/50'
                          )}
                        >
                          <Moon className="w-4 h-4" /> Dark Mode
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2 border-t border-border dark:border-border-dark">
                      <div>
                        <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Notifications</p>
                        <p className="text-xs text-text-muted">Receive job completion alerts</p>
                      </div>
                      <button
                        onClick={() => setNotifications(!notifications)}
                        className={cn(
                          'w-11 h-6 rounded-full transition-colors relative',
                          notifications ? 'bg-primary' : 'bg-text-muted/30'
                        )}
                      >
                        <span
                          className={cn(
                            'block w-5 h-5 rounded-full bg-white transition-transform transform',
                            notifications ? 'translate-x-5' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-xs">
                      {saved ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <Check className="w-4 h-4" /> Preferences Saved
                        </span>
                      ) : settingsError ? (
                        <span className="text-red-500">{settingsError}</span>
                      ) : null}
                    </div>
                    <button
                      onClick={handleSaveSettings}
                      disabled={saving}
                      className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save Preferences'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
