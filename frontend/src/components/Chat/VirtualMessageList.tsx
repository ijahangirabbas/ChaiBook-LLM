import { useRef, type RefObject, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { MessageBubble } from '../MessageBubble/MessageBubble'
import type { Message } from '../../types'

interface VirtualMessageListProps {
  messages: Message[]
  scrollRef: RefObject<HTMLElement | null>
  onRegenerate?: (assistantMessageId: string) => void
  renderExtras?: (message: Message) => ReactNode
}

export function VirtualMessageList({
  messages,
  scrollRef,
  onRegenerate,
  renderExtras,
}: VirtualMessageListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 180,
    overscan: 8,
  })

  if (messages.length <= 30) {
    return (
      <div ref={listRef} className="space-y-6">
        {messages.map((msg) => (
          <div key={msg.id}>
            <MessageBubble
              message={msg}
              onRegenerate={msg.role === 'assistant' && onRegenerate ? () => onRegenerate(msg.id) : undefined}
            />
            {renderExtras?.(msg)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const msg = messages[virtualRow.index]
        return (
          <div
            key={msg.id}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className="pb-6"
          >
            <MessageBubble
              message={msg}
              onRegenerate={msg.role === 'assistant' && onRegenerate ? () => onRegenerate(msg.id) : undefined}
            />
            {renderExtras?.(msg)}
          </div>
        )
      })}
    </div>
  )
}
