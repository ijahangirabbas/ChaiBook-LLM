import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Paperclip, Send } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ChatInputProps {
  onSend?: (message: string) => void
  placeholder?: string
  disabled?: boolean
  disclaimer?: string
}

export function ChatInput({
  onSend,
  placeholder = 'Ask anything about your sources...',
  disabled = false,
  disclaimer = 'ChaiBook LLM can make mistakes. Please verify important information.',
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!value.trim() || disabled) return
    onSend?.(value.trim())
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-resize textarea
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  return (
    <div className="w-full">
      {/* Input container: clean border in light and dark mode, no white glow */}
      <div
        className={cn(
          'flex items-end gap-3 px-4 py-3.5',
          'bg-card dark:bg-[#0A0A0A] rounded-input',
          'border border-border dark:border-[#1C1C1C]',
          'shadow-card dark:shadow-none transition-all duration-200',
          'focus-within:border-primary dark:focus-within:border-primary',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      >
        {/* Attachment button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-lg shrink-0 self-end mb-0.5',
            'text-text-muted dark:text-text-muted-dark',
            'hover:text-primary hover:bg-primary/5 dark:hover:bg-white/5 transition-colors duration-150',
            disabled && 'pointer-events-none'
          )}
          aria-label="Attach file"
          tabIndex={disabled ? -1 : 0}
        >
          <Paperclip className="w-4 h-4" />
        </motion.button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Chat message input"
          className={cn(
            'flex-1 resize-none bg-transparent',
            'text-sm text-text-primary dark:text-text-primary-dark',
            'placeholder:text-text-muted dark:placeholder:text-text-muted-dark',
            'focus:outline-none leading-relaxed py-1',
            'max-h-40 scrollbar-hide',
            disabled && 'cursor-not-allowed'
          )}
          style={{ minHeight: '24px' }}
        />

        {/* Send button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-xl shrink-0 self-end',
            'transition-all duration-200',
            value.trim() && !disabled
              ? 'bg-primary text-white shadow-sm hover:bg-primary-hover'
              : 'bg-gray-100 dark:bg-white/5 text-text-muted dark:text-text-muted-dark cursor-not-allowed'
          )}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Disclaimer */}
      {disclaimer && (
        <p className="text-center text-xs text-text-muted dark:text-text-muted-dark mt-2">
          {disclaimer}
        </p>
      )}
    </div>
  )
}
