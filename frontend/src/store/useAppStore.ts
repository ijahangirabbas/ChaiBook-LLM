import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, User, Message, Notebook, SidebarMode, Source, SourceIndexingStatus } from '../types'
import { ApiService } from '../services/api.service'

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ─── Auth ─────────────────────────────────────────────────────────
      isAuthenticated: false,
      user: null,

      // ─── Theme (default: light) ────────────────────────────────────────
      theme: 'light',

      // ─── Sidebar ──────────────────────────────────────────────────────
      sidebarOpen: true,
      sidebarMode: 'dashboard',

      // ─── Notebooks ────────────────────────────────────────────────────
      notebooks: [],
      activeNotebookId: null,
      loadingNotebooks: false,
      notebooksError: null,

      fetchNotebooksFromApi: async () => {
        set({ loadingNotebooks: true, notebooksError: null })
        try {
          const fetched = await ApiService.getNotebooks()
          set({ notebooks: fetched, loadingNotebooks: false })
        } catch (err: any) {
          const is401 = err?.message?.includes('401') || err?.message?.includes('Unauthorized');
          set({
            notebooksError: is401
              ? 'Please sign in to view and manage your notebooks.'
              : err?.message || 'Unable to connect to server and load notebooks.',
            loadingNotebooks: false,
          })
        }
      },

      // ─── Chat Sessions & Messages ──────────────────────────────────────
      chatSessions: [],
      activeChatSessionId: null,
      messages: [],
      isStreaming: false,

      // ─── Sources ──────────────────────────────────────────────────────
      sources: [],

      // ─── Source Inspector ─────────────────────────────────────────────
      sourceInspectorOpen: false,
      activeSourceId: null,
      activeSourceTab: 'retrieved',

      // ─── Add Source & Sources Modal ──────────────────────────────────
      addSourceModalOpen: false,
      sourcesModalOpen: false,

      // ─── Search ───────────────────────────────────────────────────────
      searchOpen: false,
      searchQuery: '',

      // ─── Actions ──────────────────────────────────────────────────────
      login: (user: User) => {
        set({ isAuthenticated: true, user })
        const theme = get().theme
        if (theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          user: null,
          messages: [],
          activeNotebookId: null,
          activeChatSessionId: null,
          sourceInspectorOpen: false,
          addSourceModalOpen: false,
          sourcesModalOpen: false,
          notebooks: [],
          sources: [],
          chatSessions: [],
        })
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: newTheme })
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

      setSidebarMode: (mode: SidebarMode) => set({ sidebarMode: mode }),

      setActiveNotebook: (id: string | null) => {
        const state = get()
        // Find existing or first session for this notebook
        const sessions = state.chatSessions.filter((s) => s.notebookId === id)
        if (sessions.length > 0) {
          set({
            activeNotebookId: id,
            activeChatSessionId: sessions[0].id,
            messages: sessions[0].messages,
          })
        } else if (id) {
          // Auto-create initial session if none exists
          const newSessId = `chat-sess-${Date.now()}`
          const newSession = {
            id: newSessId,
            notebookId: id,
            title: `Chat 1: Overview`,
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [],
          }
          set({
            activeNotebookId: id,
            activeChatSessionId: newSessId,
            chatSessions: [newSession, ...state.chatSessions],
            messages: [],
          })
        } else {
          set({ activeNotebookId: null, activeChatSessionId: null, messages: [] })
        }
      },

      createChatSession: (notebookId: string, title?: string) => {
        const state = get()
        const notebookSessions = state.chatSessions.filter((s) => s.notebookId === notebookId)
        const nextNum = notebookSessions.length + 1
        const newSessId = `chat-sess-${Date.now()}`
        const newSession = {
          id: newSessId,
          notebookId,
          title: title || `Chat ${nextNum}: Discussion`,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        }
        set({
          chatSessions: [newSession, ...state.chatSessions],
          activeChatSessionId: newSessId,
          messages: [],
        })
        return newSessId
      },

      switchChatSession: (sessionId: string) => {
        const state = get()
        const targetSession = state.chatSessions.find((s) => s.id === sessionId)
        if (targetSession) {
          set({
            activeChatSessionId: sessionId,
            activeNotebookId: targetSession.notebookId,
            messages: targetSession.messages,
          })
        }
      },

      deleteChatSession: (sessionId: string) => {
        set((state) => {
          const updated = state.chatSessions.filter((s) => s.id !== sessionId)
          const activeSess = updated[0] ? updated[0].id : null
          const activeMsgs = updated[0] ? updated[0].messages : []
          return {
            chatSessions: updated,
            activeChatSessionId: activeSess,
            messages: activeMsgs,
          }
        })
      },

      addMessage: (message: Message) => {
        set((state) => {
          const activeSessId = state.activeChatSessionId
          const updatedSessions = state.chatSessions.map((sess) =>
            sess.id === activeSessId
              ? { ...sess, messages: [...sess.messages, message], updatedAt: new Date() }
              : sess
          )
          return {
            messages: [...state.messages, message],
            chatSessions: updatedSessions,
          }
        })
      },

      setStreaming: (streaming: boolean) => set({ isStreaming: streaming }),

      openSourceInspector: (sourceId: string) =>
        set({ sourceInspectorOpen: true, activeSourceId: sourceId }),

      closeSourceInspector: () =>
        set({ sourceInspectorOpen: false, activeSourceId: null }),

      setActiveSourceTab: (tab) => set({ activeSourceTab: tab }),

      setAddSourceModalOpen: (open: boolean) => set({ addSourceModalOpen: open }),

      setSourcesModalOpen: (open: boolean) => set({ sourcesModalOpen: open }),

      setSearchOpen: (open: boolean) => set({ searchOpen: open }),

      setSearchQuery: (query: string) => set({ searchQuery: query }),

      addNotebook: (notebook: Notebook) =>
        set((state) => ({ notebooks: [notebook, ...state.notebooks] })),

      updateNotebookTitle: (id: string, title: string) =>
        set((state) => ({
          notebooks: state.notebooks.map((nb) => (nb.id === id ? { ...nb, title, updatedAt: new Date() } : nb)),
        })),

      addSource: (source: Source) =>
        set((state) => ({ sources: [source, ...state.sources] })),

      removeSource: (sourceId: string) =>
        set((state) => ({
          sources: state.sources.filter((s) => s.id !== sourceId),
          activeSourceId: state.activeSourceId === sourceId ? null : state.activeSourceId,
          sourceInspectorOpen: state.activeSourceId === sourceId ? false : state.sourceInspectorOpen,
        })),

      reindexSource: (sourceId: string) =>
        set((state) => ({
          sources: state.sources.map((s) =>
            s.id === sourceId
              ? { ...s, status: 'indexing' as const, indexingProgress: 20, errorMessage: undefined }
              : s
          ),
        })),

      updateSourceStatus: (sourceId: string, status: SourceIndexingStatus, progress?: number) =>
        set((state) => ({
          sources: state.sources.map((s) =>
            s.id === sourceId ? { ...s, status, indexingProgress: progress ?? s.indexingProgress } : s
          ),
        })),
    }),
    {
      name: 'chaibook-storage',
      partialize: (state) => ({
        theme: state.theme,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        activeNotebookId: state.activeNotebookId,
        notebooks: state.notebooks,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
    }
  )
)
