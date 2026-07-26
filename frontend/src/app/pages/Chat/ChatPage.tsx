import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Pencil, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '../../../components/Header/Header'
import { ChatInput } from '../../../components/ChatInput/ChatInput'
import { MessageBubble } from '../../../components/MessageBubble/MessageBubble'
import { SourceCard } from '../../../components/SourceCard/SourceCard'
import { useAppStore } from '../../../store/useAppStore'
import { generateId } from '../../../lib/utils'
import type { Message } from '../../../types'
import { ApiService } from '../../../services/api.service'
import { cn } from '../../../lib/utils'

export function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    notebooks,
    loadingNotebooks,
    sources,
    messages: storeMessages,
    addMessage,
    updateNotebookTitle,
    openSourceInspector,
    sourceInspectorOpen,
    setSourcesModalOpen,
    setAddSourceModalOpen,
    setActiveNotebook,
    chatSessions,
    activeChatSessionId,
    fetchNotebooksFromApi,
  } = useAppStore()

  const currentNotebookId = id

  // Sync active notebook ID in store & fetch notebooks on refresh
  useEffect(() => {
    if (currentNotebookId) {
      setActiveNotebook(currentNotebookId)
    }
    fetchNotebooksFromApi()
  }, [currentNotebookId, setActiveNotebook, fetchNotebooksFromApi])

  const currentNotebook = notebooks.find((n) => n.id === currentNotebookId)
  const notebookTitle = currentNotebook?.title ?? 'Research Notebook'

  const activeSession = chatSessions.find((s) => s.id === activeChatSessionId)
  const currentMessages = activeSession ? activeSession.messages : storeMessages

  const [showAllSources, setShowAllSources] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(notebookTitle)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTitleInput(notebookTitle)
  }, [notebookTitle])

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])

  if (!currentNotebookId) {
    return <div className="p-8 text-sm text-text-muted">This notebook is unavailable. Return to your dashboard and select a notebook.</div>
  }

  if (loadingNotebooks) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-bg dark:bg-bg-dark">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs text-text-muted">Loading workspace notebook...</span>
      </div>
    )
  }

  if (!currentNotebook) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-bg dark:bg-bg-dark p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center text-2xl mb-3">
          ⚠️
        </div>
        <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark mb-1">Notebook Not Found</h2>
        <p className="text-xs text-text-muted mb-4">The requested notebook could not be found or you do not have permission to view it.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

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
    addMessage(userMsg)
    setIsStreaming(true)

    const aiMsgId = generateId()
    const activeNotebookSources = sources.filter(
      (s) => !s.notebookId || s.notebookId === currentNotebookId
    )

    let accumulatedContent = ''

    await ApiService.streamRAGChat(
      currentNotebookId,
      content,
      (token) => {
        accumulatedContent += token
      },
      () => {
        const aiMsg: Message = {
          id: aiMsgId,
          role: 'assistant',
          content: accumulatedContent || 'The response completed without content. Please try again.',
          timestamp: new Date(),
          sources: activeNotebookSources,
          isStreaming: false,
        }
        addMessage(aiMsg)
        setIsStreaming(false)
      },
      (error) => {
        const aiMsg: Message = {
          id: aiMsgId,
          role: 'assistant',
          content: accumulatedContent || `Unable to generate a response: ${error instanceof Error ? error.message : 'please try again.'}`,
          timestamp: new Date(),
          sources: activeNotebookSources,
          isStreaming: false,
        }
        addMessage(aiMsg)
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
            {notebookTitle}
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
            {currentMessages.length === 0 ? (
              <div className="flex-1 h-full flex flex-col items-center justify-center text-center py-16">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col items-center max-w-sm"
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className={cn(
                      'w-20 h-20 rounded-2xl mb-5 flex items-center justify-center',
                      'bg-primary/10 border-2 border-dashed border-primary/30 text-primary'
                    )}
                  >
                    <span className="text-4xl">☕</span>
                  </motion.div>
                  <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark mb-1.5">
                    Start a new conversation
                  </h2>
                  <p className="text-xs text-text-muted dark:text-text-muted-dark mb-6 leading-relaxed">
                    Ask questions grounded in your uploaded documents or click below to add your first source.
                  </p>
                  <button
                    onClick={() => setAddSourceModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    + Add Source
                  </button>
                </motion.div>
              </div>
            ) : (
              <AnimatePresence>
                {currentMessages.map((message) => (
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
            )}

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
