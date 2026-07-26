import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Pencil, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '../../../components/Header/Header'
import { ChatInput } from '../../../components/ChatInput/ChatInput'
import { MessageBubble } from '../../../components/MessageBubble/MessageBubble'
import { SourceCard } from '../../../components/SourceCard/SourceCard'
import { useAppStore } from '../../../store/useAppStore'
import { MOCK_MESSAGES } from '../../../lib/constants'
import { generateId } from '../../../lib/utils'
import type { Message } from '../../../types'
import { ApiService } from '../../../services/api.service'
import { cn } from '../../../lib/utils'

export function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    notebooks,
    sources,
    updateNotebookTitle,
    openSourceInspector,
    sourceInspectorOpen,
    setSourcesModalOpen,
    setActiveNotebook,
  } = useAppStore()

  const currentNotebookId = id || 'nb-1'

  // Sync active notebook ID in store
  useEffect(() => {
    if (currentNotebookId) {
      setActiveNotebook(currentNotebookId)
    }
  }, [currentNotebookId, setActiveNotebook])

  const currentNotebook = notebooks.find((n) => n.id === currentNotebookId) || {
    id: currentNotebookId,
    title: 'Machine Learning Notes',
    sourceCount: 4,
    color: 'indigo' as const,
    icon: 'BookOpen',
  }

  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES)
  const [showAllSources, setShowAllSources] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(currentNotebook.title)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTitleInput(currentNotebook.title)
  }, [currentNotebook.title])

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      updateNotebookTitle(currentNotebookId, titleInput.trim())
      ApiService.updateNotebook(currentNotebookId, { title: titleInput.trim() })
    }
    setIsEditingTitle(false)
  }

  const handleSend = async (content: string) => {
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsStreaming(true)

    const aiMsgId = generateId()
    const activeNotebookSources = sources.filter(
      (s) => !s.notebookId || s.notebookId === currentNotebookId
    )

    // Initial empty assistant message
    const initialAiMsg: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      sources: activeNotebookSources,
      isStreaming: true,
    }

    setMessages((prev) => [...prev, initialAiMsg])

    let accumulatedContent = ''

    await ApiService.streamRAGChat(
      currentNotebookId,
      content,
      (token) => {
        accumulatedContent += token
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId ? { ...msg, content: accumulatedContent } : msg
          )
        )
      },
      () => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId ? { ...msg, isStreaming: false } : msg
          )
        )
        setIsStreaming(false)
      },
      (_err) => {
        // Fallback response if offline or backend processing
        if (!accumulatedContent) {
          accumulatedContent = `Based on your indexed sources in "${currentNotebook.title}", RAG retrieval combines your uploaded knowledge base with AI to answer accurately.`
        }
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMsgId ? { ...msg, content: accumulatedContent, isStreaming: false } : msg
          )
        )
        setIsStreaming(false)
      }
    )
  }

  // Header content with editable title & quick sources modal button
  const headerLeft = (
    <div className="flex items-center gap-3">
      <motion.button
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/dashboard')}
        className={cn(
          'w-8 h-8 flex items-center justify-center rounded-full',
          'text-text-secondary dark:text-text-secondary-dark',
          'hover:bg-gray-100 dark:hover:bg-white/10 transition-colors'
        )}
        aria-label="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
      </motion.button>

      {isEditingTitle ? (
        <input
          type="text"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          onBlur={handleTitleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTitleSubmit()
          }}
          autoFocus
          className="text-[15px] font-semibold bg-transparent border-b border-primary text-text-primary dark:text-text-primary-dark focus:outline-none px-1"
        />
      ) : (
        <div className="flex items-center gap-2">
          <h1 className="text-[15px] font-semibold text-text-primary dark:text-text-primary-dark">
            {currentNotebook.title}
          </h1>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsEditingTitle(true)}
            className={cn(
              'w-6 h-6 flex items-center justify-center rounded-md',
              'text-text-muted dark:text-text-muted-dark',
              'hover:bg-gray-100 dark:hover:bg-white/10 transition-colors'
            )}
            aria-label="Rename notebook"
          >
            <Pencil className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      )}

      <button
        onClick={() => setSourcesModalOpen(true)}
        className="ml-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
      >
        View Sources
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      <Header title="Untitled Notebook" leftContent={headerLeft} />

      {/* Message thread + source inspector side by side */}
      <div className="flex flex-1 min-h-0">
        {/* Message thread */}
        <div className={cn(
          'flex flex-col flex-1 min-w-0 transition-all duration-300',
          sourceInspectorOpen && 'md:mr-[340px] lg:mr-[360px]'
        )}>
          {/* Messages scroll area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <AnimatePresence>
              {messages.map((message) => (
                <div key={message.id}>
                  <MessageBubble
                    message={message}
                    onRegenerate={() => {}}
                  />

                  {/* Sources below AI messages */}
                  {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-4 ml-11"
                    >
                      {/* Sources header */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-semibold text-text-primary dark:text-text-primary-dark">
                          Sources
                        </span>
                        <button
                          className="text-text-muted dark:text-text-muted-dark hover:text-primary transition-colors"
                          aria-label="Sources information"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Horizontal source cards */}
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {(showAllSources ? message.sources : message.sources.slice(0, 4)).map((source) => (
                          <SourceCard
                            key={source.id}
                            source={source}
                            onClick={() => openSourceInspector(source.id)}
                            isActive={useAppStore.getState().activeSourceId === source.id}
                          />
                        ))}
                      </div>

                      {/* Show more / less */}
                      {message.sources.length > 4 && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowAllSources(!showAllSources)}
                          className={cn(
                            'mt-3 flex items-center gap-2 px-4 py-2 rounded-full',
                            'border border-border dark:border-border-dark',
                            'bg-card dark:bg-card-dark',
                            'text-xs font-semibold text-text-secondary dark:text-text-secondary-dark',
                            'hover:border-primary/30 hover:text-primary transition-all duration-150'
                          )}
                          aria-expanded={showAllSources}
                          aria-label={showAllSources ? 'Show fewer sources' : 'Show more sources'}
                        >
                          {showAllSources ? (
                            <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>Show more sources <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </motion.button>
                      )}
                    </motion.div>
                  )}
                </div>
              ))}
            </AnimatePresence>

            {/* Streaming indicator */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-sm">☕</span>
                </div>
                <div className={cn(
                  'px-4 py-3 rounded-[22px] rounded-tl-sm',
                  'bg-card dark:bg-card-dark border border-border dark:border-border-dark'
                )}>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom input */}
          <div className={cn(
            'border-t border-border dark:border-border-dark',
            'bg-bg dark:bg-bg-dark px-6 py-4'
          )}>
            <ChatInput
              onSend={handleSend}
              placeholder="Ask anything about your sources..."
              disabled={isStreaming}
              disclaimer="ChaiBook LLM can make mistakes. Please verify important information."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
