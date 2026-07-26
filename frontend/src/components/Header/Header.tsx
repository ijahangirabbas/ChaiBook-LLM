import { motion } from 'framer-motion'
import { Sun, Moon, Bell, HelpCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { SearchBar } from '../SearchBar/SearchBar'
import { UserMenu } from '../UserMenu/UserMenu'
import { cn } from '../../lib/utils'

interface HeaderProps {
  title: string
  leftContent?: React.ReactNode
}

export function Header({ title, leftContent }: HeaderProps) {
  const { theme, toggleTheme } = useAppStore()

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-14 flex items-center justify-between px-6',
        'bg-card/80 dark:bg-card-dark/80 backdrop-blur-md',
        'border-b border-border dark:border-border-dark',
      )}
      role="banner"
    >
      {/* Left: title or custom content */}
      <div className="flex items-center gap-3 min-w-0">
        {leftContent || (
          <h1 className="text-[15px] font-semibold text-text-primary dark:text-text-primary-dark truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <SearchBar />

        {/* Theme toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-full',
            'text-text-secondary dark:text-text-secondary-dark',
            'hover:bg-gray-100 dark:hover:bg-white/10',
            'transition-colors duration-150'
          )}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </motion.button>

        {/* Notification */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Notifications"
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-full relative',
            'text-text-secondary dark:text-text-secondary-dark',
            'hover:bg-gray-100 dark:hover:bg-white/10',
            'transition-colors duration-150'
          )}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </motion.button>

        {/* Help */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Help"
          className={cn(
            'w-9 h-9 hidden md:flex items-center justify-center rounded-full',
            'text-text-secondary dark:text-text-secondary-dark',
            'hover:bg-gray-100 dark:hover:bg-white/10',
            'transition-colors duration-150'
          )}
        >
          <HelpCircle className="w-4 h-4" />
        </motion.button>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
