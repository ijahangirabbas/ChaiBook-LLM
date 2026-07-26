import { motion } from 'framer-motion'
import { CheckCircle2, FileText, FileCode } from 'lucide-react'
import { cn } from '../../lib/utils'

// Floating source type badge component (flat, crisp, zero glow/shadow)
function FloatingBadge({ label, icon, style, delay = 0 }: {
  label: string
  icon: React.ReactNode
  style?: React.CSSProperties
  delay?: number
}) {
  return (
    <motion.div
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay }}
      className={cn(
        'flex items-center gap-2 px-3.5 py-2 rounded-2xl',
        'bg-card dark:bg-[#0A0A0A]',
        'border border-border dark:border-[#1C1C1C]',
        'absolute text-xs font-semibold text-text-primary dark:text-text-primary-dark select-none',
        'whitespace-nowrap z-20'
      )}
      style={style}
    >
      {icon}
      {label}
    </motion.div>
  )
}

export function HeroBanner() {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-[26px] p-8 xl:p-10',
      'bg-[#EEF1FF] dark:bg-[#0A0A10]',
      'border border-border dark:border-[#1C1C1C]',
      'min-h-[250px]'
    )}>
      <div className="flex items-center justify-between">
        {/* Left content */}
        <div className="max-w-[55%] relative z-10">
          {/* Chai icon */}
          <div className="text-3xl mb-3">☕</div>

          <h1 className="text-2xl xl:text-3xl font-extrabold text-text-primary dark:text-text-primary-dark leading-tight mb-1">
            Your AI Notebook for
          </h1>
          <h2 className="text-2xl xl:text-3xl font-extrabold text-primary leading-tight mb-3">
            Smarter Learning & Research.
          </h2>

          <p className="text-sm xl:text-base text-text-secondary dark:text-text-secondary-dark leading-relaxed mb-5 max-w-lg">
            ChaiBook LLM helps you understand, organize, and discover insights from all your sources — in one intelligent workspace.
          </p>

          {/* Features checklist */}
          <div className="flex flex-wrap items-center gap-5 text-xs xl:text-sm font-semibold">
            {[
              { label: 'AI-Powered' },
              { label: 'Source-Aware' },
              { label: 'Private & Secure' },
            ].map((feat) => (
              <div key={feat.label} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-text-secondary dark:text-text-secondary-dark">
                  {feat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Graphic Area: Centered Coffee Cup + Surrounding Badges (Zero Glow/Shadow) */}
        <div className="relative hidden lg:flex items-center justify-center w-[360px] h-[220px]">
          
          {/* Center Tea Cup ☕ Card */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className={cn(
              'relative z-10 w-24 h-24 rounded-3xl',
              'bg-card dark:bg-[#0A0A0A]',
              'border border-border dark:border-[#1C1C1C]',
              'flex flex-col items-center justify-center text-center'
            )}
          >
            <span className="text-5xl select-none">☕</span>
          </motion.div>

          {/* Floating Badges Positioned Around Center Cup */}

          {/* Top-Left: PDF */}
          <FloatingBadge
            label="PDF"
            delay={0.1}
            icon={
              <div className="w-5 h-5 bg-red-500 rounded-md flex items-center justify-center shrink-0">
                <span className="text-white text-[8px] font-bold">PDF</span>
              </div>
            }
            style={{ top: '8px', left: '15px' }}
          />

          {/* Top-Right: YouTube */}
          <FloatingBadge
            label="YouTube"
            delay={0.4}
            icon={
              <div className="w-5 h-5 bg-red-600 rounded-md flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                  <path d="M10 15l5.19-3L10 9v6zm11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z"/>
                </svg>
              </div>
            }
            style={{ top: '8px', right: '15px' }}
          />

          {/* Mid-Left: Text File (.txt) */}
          <FloatingBadge
            label="Text (.txt)"
            delay={0.7}
            icon={
              <div className="w-5 h-5 bg-blue-500 rounded-md flex items-center justify-center shrink-0">
                <FileText className="w-3 h-3 text-white" />
              </div>
            }
            style={{ top: '90px', left: '-10px' }}
          />

          {/* Mid-Right: Web Page */}
          <FloatingBadge
            label="Web Page"
            delay={1.0}
            icon={
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
            }
            style={{ top: '90px', right: '-10px' }}
          />

          {/* Bottom-Left: Subtitle (.srt / .vtt) */}
          <FloatingBadge
            label="Subtitles (.srt / .vtt)"
            delay={1.3}
            icon={
              <div className="w-5 h-5 bg-purple-500 rounded-md flex items-center justify-center shrink-0">
                <FileCode className="w-3.5 h-3.5 text-white" />
              </div>
            }
            style={{ bottom: '8px', left: '15px' }}
          />

          {/* Bottom-Right: Word / Docs */}
          <FloatingBadge
            label="Word / Docs"
            delay={1.6}
            icon={
              <div className="w-5 h-5 bg-indigo-500 rounded-md flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
            }
            style={{ bottom: '8px', right: '15px' }}
          />

        </div>
      </div>
    </div>
  )
}
