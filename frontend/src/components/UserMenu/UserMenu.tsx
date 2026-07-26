import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Settings, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

import { supabase, isSupabaseConfigured } from '../../lib/supabase'

export function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { user, logout } = useAppStore()
  const navigate = useNavigate()

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
    if (supabase && isSupabaseConfigured) {
      await supabase.auth.signOut()
    }
    logout()
    navigate('/')
  }

  const initials = user?.name?.charAt(0).toUpperCase() || 'M'

  return (
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
                    {user?.name}
                  </p>
                  <p className="text-xs text-text-muted dark:text-text-muted-dark truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1.5">
              {[
                { icon: User, label: 'Profile', onClick: () => setOpen(false) },
                { icon: Settings, label: 'Settings', onClick: () => setOpen(false) },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  role="menuitem"
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-sidebar-item text-sm',
                    'text-text-secondary dark:text-text-secondary-dark',
                    'hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10',
                    'transition-colors duration-150'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
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
  )
}
