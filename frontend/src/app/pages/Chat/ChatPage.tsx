import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Pencil, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Header } from '../../../components/Header/Header'
import { ChatInput } from '../../../components/ChatInput/ChatInput'
import { MessageBubble } from '../../../components/MessageBubble/MessageBubble'
import { SourceCard } from '../../../components/SourceCard/SourceCard'
import { useAppStore } from '../../../store/useAppStore'
import { generateId } from '../../../lib/utils'
import { mapCitationsToSources } from '../../../lib/chat.utils'
import type { Message, Source } from '../../../types'
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
    updateMessage,
    removeMessage,
    setStreaming,
    updateNotebookTitle,
    openSourceInspector,
    sourceInspectorOpen,
    setSourcesModalOpen,
    setAddSourceModalOpen,
    setActiveNotebook,
    chatSessions,
    activeChatSessionId,
    createChatSession,
    fetchNotebooksFromApi,
    switchChatSession,
  } = useAppStore()

  const currentNotebookId = id
  const location = useLocation()
  const streamAbortRef = useRef<AbortController | null>(null)
  const initialActionRef = useRef(false)

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages, isStreaming])

  const runChatStream = useCallback(
    async (
      content: string,
      options?: { regenerate?: boolean; skipUserMessage?: boolean; conversationId?: string }
    ) => {
      if (!currentNotebookId) return

      let conversationId = options?.conversationId || activeChatSessionId

      if (!conversationId) {
        try {
          conversationId = await createChatSession(currentNotebookId, content.slice(0, 40) || 'New Conversation')
        } catch (err) {
          console.error('Failed to create conversation:', err)
          return
        }
      }

      if (!options?.skipUserMessage) {
        const userMsg: Message = {
          id: generateId(),
          role: 'user',
          content,
          timestamp: new Date(),
        }
        addMessage(userMsg)
      }

      const aiMsgId = generateId()
      addMessage({
        id: aiMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      })

      setIsStreaming(true)
      setStreaming(true)

      const activeNotebookSources = sources.filter(
        (s) => !s.notebookId || s.notebookId === currentNotebookId
      )

      let accumulatedContent = ''
      let retrievedCitations: any[] = []

      streamAbortRef.current = new AbortController()

      const finish = (sourcesForMessage?: Source[], errorContent?: string) => {
        updateMessage(aiMsgId, {
          content:
            errorContent ||
            accumulatedContent ||
            'The response completed without content. Please try again.',
          sources: sourcesForMessage,
          isStreaming: false,
        })
        setIsStreaming(false)
        setStreaming(false)
        streamAbortRef.current = null
      }

      await ApiService.streamRAGChat(
        currentNotebookId,
        content,
        (token) => {
          accumulatedContent += token
          updateMessage(aiMsgId, { content: accumulatedContent, isStreaming: true })
        },
        () => {
          const finalSources = mapCitationsToSources(
            retrievedCitations,
            activeNotebookSources,
            currentNotebookId
          )
          finish(finalSources.length > 0 ? finalSources : undefined)
        },
        (error) => {
          const isAbort =
            (error instanceof DOMException && error.name === 'AbortError') ||
            (error instanceof Error && error.message.toLowerCase().includes('abort'))
          if (isAbort) {
            finish(
              undefined,
              accumulatedContent.trim()
                ? `${accumulatedContent}\n\n_(Generation stopped.)_`
                : '_(Generation stopped.)_'
            )
            return
          }
          const isTimeout = error instanceof DOMException && error.name === 'TimeoutError'
          finish(
            undefined,
            accumulatedContent ||
              (isTimeout
                ? 'Request timed out. Please try again.'
                : `Unable to generate a response: ${error instanceof Error ? error.message : 'please try again.'}`)
          )
        },
        (citations) => {
          retrievedCitations = citations
        },
        {
          signal: streamAbortRef.current.signal,
          conversationId: conversationId || undefined,
          regenerate: options?.regenerate,
          onConversationStarted: (newConversationId) => {
            if (!activeChatSessionId) {
              useAppStore.setState({ activeChatSessionId: newConversationId })
            }
          },
        }
      )
    },
    [
      currentNotebookId,
      activeChatSessionId,
      createChatSession,
      addMessage,
      updateMessage,
      setStreaming,
      sources,
    ]
  )

  useEffect(() => {
    if (!currentNotebookId || loadingNotebooks || !currentNotebook || initialActionRef.current) return

    const state = (location.state || {}) as { initialMessage?: string; conversationId?: string }

    if (state.conversationId) {
      const sessionExists = chatSessions.some((s) => s.id === state.conversationId)
      if (sessionExists) {
        switchChatSession(state.conversationId)
      }
    }

    if (state.initialMessage?.trim()) {
      initialActionRef.current = true
      const message = state.initialMessage
      navigate(location.pathname, {
        replace: true,
        state: state.conversationId ? { conversationId: state.conversationId } : {},
      })
      void runChatStream(message)
      return
    }

    if (state.conversationId && chatSessions.some((s) => s.id === state.conversationId)) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [
    chatSessions,
    currentNotebookId,
    currentNotebook,
    loadingNotebooks,
    location.pathname,
    location.state,
    navigate,
    runChatStream,
    switchChatSession,
  ])

  const handleSend = (content: string) => {
    void runChatStream(content)
  }

  const handleStop = () => {
    streamAbortRef.current?.abort(new DOMException('Stream cancelled by user', 'AbortError'))
  }

  const handleRegenerate = (assistantMessageId: string) => {
    const assistantIndex = currentMessages.findIndex((m) => m.id === assistantMessageId)
    if (assistantIndex <= 0) return

    const priorUser = [...currentMessages.slice(0, assistantIndex)]
      .reverse()
      .find((m) => m.role === 'user')
    if (!priorUser) return

    removeMessage(assistantMessageId)
    void runChatStream(priorUser.content, {
      regenerate: true,
      skipUserMessage: true,
      conversationId: activeChatSessionId || undefined,
    })
  }

  if (!currentNotebookId) {
    return (
      <div className="p-8 text-sm text-text-muted">
        This notebook is unavailable. Return to your dashboard and select a notebook.
      </div>
    )
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
        <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark mb-1">
          Notebook Not Found
        </h2>
        <p className="text-xs text-text-muted mb-4">
          The requested notebook could not be found or you do not have permission to view it.
        </p>
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

      <div className="flex flex-1 min-h-0">
        <div
          className={cn(
            'flex flex-col flex-1 min-w-0 transition-all duration-300',
            sourceInspectorOpen && 'md:mr-[340px] lg:mr-[360px]'
          )}
        >
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
                      onRegenerate={
                        message.role === 'assistant' && !message.isStreaming
                          ? () => handleRegenerate(message.id)
                          : undefined
                      }
                    />

                    {message.role === 'assistant' && message.sources && message.sources.length > 0 && !message.isStreaming && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 ml-11"
                      >
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

                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {(showAllSources ? message.sources : message.sources.slice(0, 4)).map((source) => (
                            <SourceCard
                              key={source.id}
                              source={source}
                              onClick={() => openSourceInspector(source.id, source, 'retrieved')}
                              isActive={useAppStore.getState().activeSourceId === source.id}
                            />
                          ))}
                        </div>

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
                          >
                            {showAllSources ? (
                              <>
                                Show less <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                Show more sources <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            )}
                          </motion.button>
                        )}
                      </motion.div>
                    )}
                  </div>
                ))}
              </AnimatePresence>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div
            className={cn(
              'border-t border-border dark:border-border-dark',
              'bg-bg dark:bg-bg-dark px-6 py-4'
            )}
          >
            <ChatInput
              onSend={handleSend}
              onStop={handleStop}
              isStreaming={isStreaming}
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
