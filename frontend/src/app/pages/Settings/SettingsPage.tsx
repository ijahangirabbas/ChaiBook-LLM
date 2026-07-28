import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Moon, Sun, Bell, Download, Trash2, Check, AlertTriangle } from 'lucide-react'
import { useClerk } from '@clerk/clerk-react'
import { Header } from '../../../components/Header/Header'
import { useAppStore } from '../../../store/useAppStore'
import { ApiService } from '../../../services/api.service'
import { cn } from '../../../lib/utils'

export function SettingsPage() {
  const navigate = useNavigate()
  const { signOut } = useClerk()
  const { theme, logout, user } = useAppStore()
  const [notifications, setNotifications] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const applyTheme = (next: 'light' | 'dark') => {
    useAppStore.setState({ theme: next })
    if (next === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  useEffect(() => {
    ApiService.getSettings()
      .then((settings) => {
        applyTheme(settings.theme)
        setNotifications(settings.notificationsEnabled)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const updated = await ApiService.updateSettings({
        theme,
        notificationsEnabled: notifications,
      })
      applyTheme(updated.theme)
      setNotifications(updated.notificationsEnabled)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await ApiService.exportAccountData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chaibook-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    try {
      await ApiService.deleteAccount()
      await signOut()
      logout()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Account deletion failed')
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg dark:bg-bg-dark">
      <Header title="Settings" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8 space-y-6">
          {loading ? (
            <div className="h-40 rounded-xl bg-card/60 animate-pulse border border-border/50" />
          ) : (
            <>
              <section className="p-6 rounded-card bg-card dark:bg-card-dark border border-border dark:border-border-dark space-y-5">
                <h2 className="text-sm font-bold text-text-primary dark:text-text-primary-dark">Appearance</h2>
                <div className="grid grid-cols-2 gap-3">
                  {(['light', 'dark'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => applyTheme(mode)}
                      className={cn(
                        'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all',
                        theme === mode
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border dark:border-border-dark text-text-secondary hover:border-primary/50'
                      )}
                    >
                      {mode === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      {mode === 'light' ? 'Light' : 'Dark'}
                    </button>
                  ))}
                </div>
              </section>

              <section className="p-6 rounded-card bg-card dark:bg-card-dark border border-border dark:border-border-dark">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      Notifications
                    </p>
                    <p className="text-xs text-text-muted mt-1">Receive alerts when source indexing completes</p>
                  </div>
                  <button
                    onClick={() => setNotifications(!notifications)}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative',
                      notifications ? 'bg-primary' : 'bg-text-muted/30'
                    )}
                    aria-pressed={notifications}
                  >
                    <span
                      className={cn(
                        'block w-5 h-5 rounded-full bg-white transition-transform transform',
                        notifications ? 'translate-x-5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              </section>

              <section className="p-6 rounded-card bg-card dark:bg-card-dark border border-border dark:border-border-dark space-y-3">
                <h2 className="text-sm font-bold text-text-primary dark:text-text-primary-dark">Account</h2>
                <p className="text-xs text-text-muted">{user?.email}</p>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border dark:border-border-dark text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {exporting ? 'Exporting…' : 'Export my data'}
                </button>
              </section>

              <section className="p-6 rounded-card bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-3">
                <h2 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Danger zone
                </h2>
                <p className="text-xs text-red-600/80 dark:text-red-300/80">
                  Permanently delete your account and all workspace data. This cannot be undone.
                </p>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="w-full px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-background-dark text-sm"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE'}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete account
                </button>
              </section>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex items-center justify-between">
                {saved ? (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Saved
                  </span>
                ) : (
                  <span />
                )}
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save preferences'}
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
