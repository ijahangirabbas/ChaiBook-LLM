import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { cn } from '../../lib/utils'

export function UpgradeCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn(
        'mx-3 mb-3 p-4 rounded-xl',
        'bg-primary/5 dark:bg-primary/10',
        'border border-primary/10 dark:border-primary/20'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
          <Star className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-primary">Upgrade to Pro</span>
      </div>

      {/* Description */}
      <p className="text-xs text-text-secondary dark:text-text-secondary-dark leading-relaxed mb-3">
        Unlock more sources, larger notebooks, advanced models, and premium features.
      </p>

      {/* CTA button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'w-full py-2 px-4 rounded-btn text-sm font-semibold',
          'bg-gradient-primary text-white',
          'hover:opacity-90 transition-opacity duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
        )}
        aria-label="Upgrade to Pro plan"
      >
        Upgrade Now
      </motion.button>
    </motion.div>
  )
}
