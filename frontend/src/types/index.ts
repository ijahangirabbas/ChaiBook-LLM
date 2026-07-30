// ─── Source Types ─────────────────────────────────────────────────────────────

export type SourceType = 'youtube' | 'pdf' | 'webpage' | 'text' | 'markdown' | 'word' | 'powerpoint' | 'srt' | 'vtt'

export type SourceIndexingStatus = 'uploading' | 'indexing' | 'ready' | 'error'

export interface TranscriptEntry {
  timestamp: string
  seconds: number
  text: string
  isCited?: boolean
}

export interface TimelineSegment {
  start: string
  startSeconds: number
  end: string
  endSeconds: number
}

export interface SourceChunk {
  chunkId?: string
  retrievedChunk: string
  pageNumber?: number
  similarity?: number
  timelineSegment?: TimelineSegment
  /** Matches inline [n] / Cited Sources pill index from the model */
  citationNumber?: number
}

export interface Source {
  id: string
  notebookId?: string
  type: SourceType
  title: string
  url?: string
  domain?: string
  number: number

  status?: SourceIndexingStatus
  indexingProgress?: number
  errorMessage?: string

  retrievedChunk?: string
  similarity?: number
  pageNumber?: number
  totalPages?: number
  bbox?: { x1: number; y1: number; x2: number; y2: number }
  timelineSegment?: TimelineSegment
  charOffset?: { start: number; end: number }
  transcript?: TranscriptEntry[]
  chunkIndex?: number
  chunkId?: string
  chunks?: SourceChunk[]
  pagesText?: string
}

// ─── Message Types ────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  sources?: Source[]
  isStreaming?: boolean
}

export interface ChatSession {
  id: string
  notebookId: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
}

// ─── Notebook Types ───────────────────────────────────────────────────────────

export type NotebookColor = 'indigo' | 'green' | 'blue' | 'orange' | 'purple' | 'pink' | 'teal'

export interface Notebook {
  id: string
  title: string
  sourceCount: number
  updatedAt: Date
  color: NotebookColor
  icon: string
  description?: string
}

// ─── User Types ───────────────────────────────────────────────────────────────

export type UserPlan = 'free' | 'pro' | 'team'

export interface StorageInfo {
  used: number  // in GB
  total: number // in GB
}

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  plan: UserPlan
  storage: StorageInfo
  workspaceId?: string
}

// ─── Navigation Types ─────────────────────────────────────────────────────────

export interface NavItem {
  id: string
  label: string
  icon: string
  path: string
  badge?: number
}

// ─── Quick Action Types ───────────────────────────────────────────────────────

export type QuickActionColor = 'indigo' | 'green' | 'blue' | 'orange' | 'purple' | 'pink'

export interface QuickAction {
  id: string
  label: string
  description: string
  icon: string
  color: QuickActionColor
  prompt: string
}

// ─── Feature Types ────────────────────────────────────────────────────────────

export interface Feature {
  id: string
  title: string
  description: string
  icon: string
}

// ─── App State Types ──────────────────────────────────────────────────────────

export type SidebarMode = 'dashboard' | 'notebook'

export interface AppState {
  // Auth
  isAuthenticated: boolean
  user: User | null

  // Theme
  theme: 'light' | 'dark'

  // Sidebar
  sidebarOpen: boolean
  sidebarMode: SidebarMode

  // Notebooks
  notebooks: Notebook[]
  activeNotebookId: string | null
  loadingNotebooks: boolean
  notebooksError: string | null

  // Chat Sessions
  chatSessions: ChatSession[]
  activeChatSessionId: string | null

  // Chat
  messages: Message[]
  isStreaming: boolean

  // Sources
  sources: Source[]

  // Source Inspector
  sourceInspectorOpen: boolean
  activeSourceId: string | null
  activeSourceOverride: Source | null
  activeSourceTab: 'overview' | 'retrieved'

  // Modals
  addSourceModalOpen: boolean
  sourcesModalOpen: boolean
  setSourcesModalOpen: (open: boolean) => void

  // Search
  searchOpen: boolean
  searchQuery: string

  // Actions
  login: (user: User) => void
  logout: () => void
  toggleTheme: () => void
  setSidebarOpen: (open: boolean) => void
  setSidebarMode: (mode: SidebarMode) => void
  setActiveNotebook: (id: string | null) => void
  fetchNotebooksFromApi: () => Promise<void>
  createChatSession: (notebookId: string, title?: string) => Promise<string>
  switchChatSession: (sessionId: string) => Promise<void>
  deleteChatSession: (sessionId: string) => Promise<void>
  addMessage: (message: Message, conversationId?: string) => void
  updateMessage: (messageId: string, patch: Partial<Message>, conversationId?: string) => void
  removeMessage: (messageId: string, conversationId?: string) => void
  setStreaming: (streaming: boolean) => void
  openSourceInspector: (sourceId: string, customSource?: Source, defaultTab?: 'overview' | 'retrieved') => void
  closeSourceInspector: () => void
  setActiveSourceTab: (tab: 'overview' | 'retrieved') => void
  setAddSourceModalOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
  setSearchQuery: (query: string) => void
  addNotebook: (notebook: Notebook) => void
  deleteNotebook: (id: string) => Promise<void>
  updateNotebookTitle: (id: string, title: string) => void
  addSource: (source: Source) => void
  removeSource: (sourceId: string) => void
  reindexSource: (sourceId: string) => void
  updateSourceStatus: (sourceId: string, status: SourceIndexingStatus, progress?: number) => void
  pollPendingSources: () => Promise<void>
  fetchNotebookSources: (notebookId: string, preferredConversationId?: string) => Promise<void>
  fetchNotebookChatHistory: (notebookId: string, preferredConversationId?: string) => Promise<void>
}

// ─── Add Source Modal Types ───────────────────────────────────────────────────

export type AddSourceType = 'youtube' | 'text' | 'pdf' | 'webpage' | 'srt' | 'vtt'

export interface AddSourceOption {
  type: AddSourceType
  label: string
  description: string
  icon: string
  accent: string
}

// ─── Recent Chat ──────────────────────────────────────────────────────────────

export interface RecentChat {
  id: string
  title: string
  notebookId: string
  updatedAt: Date
}
