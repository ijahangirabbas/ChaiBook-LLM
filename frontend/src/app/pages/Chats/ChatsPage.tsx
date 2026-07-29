import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, BookOpen, ArrowRight } from 'lucide-react'
import { Header } from '../../../components/Header/Header'
import { ApiService } from '../../../services/api.service'
import { cn } from '../../../lib/utils'

interface WorkspaceConversation {
  id: string
  title: string
  notebookId: string
  updatedAt: string
  notebook?: { id: string; title: string }
  _count?: { messages: number }
}

export function ChatsPage() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<WorkspaceConversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ApiService.getWorkspaceConversations()
      .then((data) => {
        if (mounted) setConversations(data)
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load conversations')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const openConversation = (conv: WorkspaceConversation) => {
    // Let ChatPage load the notebook + this conversation from DB via location state.
    navigate(`/chat/${conv.notebookId}`, { state: { conversationId: conv.id } })
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-bg dark:bg-bg-dark">
      <Header title="Recent Chats" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8 space-y-4">
          <p className="text-sm text-text-muted dark:text-text-muted-dark">
            Continue a conversation from any notebook in your workspace.
          </p>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-card/60 dark:bg-card-dark/60 animate-pulse border border-border/50" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 rounded-card border border-dashed border-border dark:border-border-dark text-center">
              <MessageCircle className="w-10 h-10 text-primary mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                No conversations yet
              </h3>
              <p className="text-xs text-text-muted mb-4">
                Start chatting in a notebook to see your conversation history here.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90"
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv, index) => (
                <motion.button
                  key={conv.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => openConversation(conv)}
                  className={cn(
                    'w-full flex items-center justify-between gap-4 p-4 rounded-xl text-left',
                    'bg-card dark:bg-card-dark border border-border dark:border-border-dark',
                    'hover:border-primary/40 hover:bg-primary/5 transition-colors'
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark truncate">
                      {conv.title || 'Untitled conversation'}
                    </p>
                    <p className="text-xs text-text-muted dark:text-text-muted-dark flex items-center gap-1.5 mt-1">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">{conv.notebook?.title || 'Notebook'}</span>
                      <span>·</span>
                      <span>{conv._count?.messages ?? 0} messages</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-text-muted">
                      {new Date(conv.updatedAt).toLocaleDateString()}
                    </p>
                    <ArrowRight className="w-4 h-4 text-primary ml-auto mt-1" />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
