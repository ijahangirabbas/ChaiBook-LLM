import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, User, Message, Notebook, SidebarMode, Source, SourceIndexingStatus } from '../types'
import { MOCK_NOTEBOOKS, MOCK_SOURCES } from '../lib/constants'

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
      notebooks: MOCK_NOTEBOOKS,
      activeNotebookId: null,

      // ─── Chat ─────────────────────────────────────────────────────────
      messages: [],
      isStreaming: false,

      // ─── Sources ──────────────────────────────────────────────────────
      sources: MOCK_SOURCES,

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
          sourceInspectorOpen: false,
          addSourceModalOpen: false,
          sourcesModalOpen: false,
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

      setActiveNotebook: (id: string | null) => set({ activeNotebookId: id }),

      addMessage: (message: Message) =>
        set((state) => ({ messages: [...state.messages, message] })),

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
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        theme: state.theme,
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
