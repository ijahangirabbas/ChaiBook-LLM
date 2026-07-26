import { motion } from 'framer-motion'
import { HardDrive } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

export function StorageCard() {
  const { user } = useAppStore()

  if (!user) return null

  const { used, total } = user.storage
  const percentage = Math.round((used / total) * 100)
  const isNearFull = percentage > 80

  return (
    <div className="px-3 pb-3">
      <div className="px-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-text-muted dark:text-text-muted-dark" />
            <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
              Storage Usage
            </span>
          </div>
          <span className={cn(
            'text-xs font-semibold',
            isNearFull ? 'text-danger' : 'text-text-muted dark:text-text-muted-dark'
          )}>
            {percentage}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mb-1.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
            className={cn(
              'h-full rounded-full',
              isNearFull ? 'bg-danger' : 'bg-gradient-primary'
            )}
          />
        </div>

        <p className="text-xs text-text-muted dark:text-text-muted-dark">
          {used} GB of {total} GB used
        </p>
      </div>
    </div>
  )
}
