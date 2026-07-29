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
          const existingLocal = get().notebooks.filter(
            (localNb) => !fetched.some((f) => f.id === localNb.id)
          )
          const merged = [...fetched, ...existingLocal]
          set({ notebooks: merged, loadingNotebooks: false })
          const activeId = get().activeNotebookId || merged[0]?.id
          if (activeId) {
            get().fetchNotebookSources(activeId)
          }
        } catch (err: any) {
          const is401 = err?.message?.includes('401') || err?.message?.includes('Unauthorized');
          if (is401) {
            get().logout();
          }
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
      activeSourceOverride: null,
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
          notebooksError: null,
          loadingNotebooks: false,
        })
        useAppStore.persist.clearStorage()
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
        if (!id) {
          set({ activeNotebookId: null, activeChatSessionId: null, messages: [] })
          return
        }
        if (get().activeNotebookId === id) {
          return
        }
        set({ activeNotebookId: id, activeChatSessionId: null, messages: [] })
        get().fetchNotebookSources(id)
      },

      createChatSession: async (notebookId: string, title?: string) => {
        const conv = await ApiService.createConversation(notebookId, title)
        const state = get()
        const newSession = {
          id: conv.id,
          notebookId,
          title: conv.title || title || 'New Conversation',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        }
        set({
          activeNotebookId: notebookId,
          activeChatSessionId: conv.id,
          chatSessions: [newSession, ...state.chatSessions.filter((s) => s.notebookId !== notebookId || s.id !== conv.id)],
          messages: [],
        })
        return conv.id
      },

      switchChatSession: async (sessionId: string) => {
        const state = get()
        const targetSession = state.chatSessions.find((s) => s.id === sessionId)
        if (targetSession) {
          let messages = targetSession.messages
          if (!messages || messages.length === 0) {
            try {
              messages = await ApiService.getConversationMessages(sessionId)
              set((st) => ({
                chatSessions: st.chatSessions.map((s) =>
                  s.id === sessionId ? { ...s, messages } : s
                ),
              }))
            } catch {
              messages = []
            }
          }
          set({
            activeChatSessionId: sessionId,
            activeNotebookId: targetSession.notebookId,
            messages,
          })
        }
      },

      deleteChatSession: async (sessionId: string) => {
        try {
          await ApiService.deleteConversation(sessionId)
        } catch {
          // proceed with local removal even if API delete fails
        }
        set((state) => {
          const updated = state.chatSessions.filter((s) => s.id !== sessionId)
          const wasActive = state.activeChatSessionId === sessionId
          const notebookSessions = updated.filter(
            (s) => s.notebookId === state.activeNotebookId
          )
          const nextSession = wasActive ? notebookSessions[0] : state.chatSessions.find((s) => s.id === state.activeChatSessionId)
          return {
            chatSessions: updated,
            activeChatSessionId: wasActive ? (nextSession?.id ?? null) : state.activeChatSessionId,
            messages: wasActive ? (nextSession?.messages ?? []) : state.messages,
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

      updateMessage: (messageId: string, patch: Partial<Message>) => {
        set((state) => {
          const patchMsg = (m: Message) => (m.id === messageId ? { ...m, ...patch } : m)
          return {
            messages: state.messages.map(patchMsg),
            chatSessions: state.chatSessions.map((sess) =>
              sess.id === state.activeChatSessionId
                ? { ...sess, messages: sess.messages.map(patchMsg), updatedAt: new Date() }
                : sess
            ),
          }
        })
      },

      removeMessage: (messageId: string) => {
        set((state) => {
          const filterMsg = (m: Message) => m.id !== messageId
          return {
            messages: state.messages.filter(filterMsg),
            chatSessions: state.chatSessions.map((sess) =>
              sess.id === state.activeChatSessionId
                ? { ...sess, messages: sess.messages.filter(filterMsg), updatedAt: new Date() }
                : sess
            ),
          }
        })
      },

      setStreaming: (streaming: boolean) => set({ isStreaming: streaming }),

      openSourceInspector: (sourceId: string, customSource?: Source, defaultTab?: 'overview' | 'retrieved') =>
        set({
          sourceInspectorOpen: true,
          activeSourceId: sourceId,
          activeSourceOverride: customSource || null,
          ...(defaultTab && { activeSourceTab: defaultTab }),
        }),

      closeSourceInspector: () =>
        set({ sourceInspectorOpen: false, activeSourceId: null, activeSourceOverride: null }),

      setActiveSourceTab: (tab) => set({ activeSourceTab: tab }),

      setAddSourceModalOpen: (open: boolean) => set({ addSourceModalOpen: open }),

      setSourcesModalOpen: (open: boolean) => set({ sourcesModalOpen: open }),

      setSearchOpen: (open: boolean) => set({ searchOpen: open }),

      setSearchQuery: (query: string) => set({ searchQuery: query }),

      addNotebook: (notebook: Notebook) =>
        set((state) => ({ notebooks: [notebook, ...state.notebooks] })),

      deleteNotebook: async (id: string) => {
        set((state) => ({
          notebooks: state.notebooks.filter((nb) => nb.id !== id),
          activeNotebookId: state.activeNotebookId === id ? null : state.activeNotebookId,
        }))
        try {
          await ApiService.deleteNotebook(id)
        } catch {
          // ignore API deletion failure
        }
      },

      updateNotebookTitle: (id: string, title: string) =>
        set((state) => ({
          notebooks: state.notebooks.map((nb) => (nb.id === id ? { ...nb, title, updatedAt: new Date() } : nb)),
        })),

      addSource: (source: Source) =>
        set((state) => ({ sources: [source, ...state.sources] })),

      removeSource: (sourceId: string) => {
        set((state) => ({
          sources: state.sources.filter((s) => s.id !== sourceId),
          activeSourceId: state.activeSourceId === sourceId ? null : state.activeSourceId,
          sourceInspectorOpen: state.activeSourceId === sourceId ? false : state.sourceInspectorOpen,
        }));
        ApiService.deleteSource(sourceId).catch(() => {
          // ignore API deletion error
        });
      },

      reindexSource: (sourceId: string) => {
        set((state) => ({
          sources: state.sources.map((s) =>
            s.id === sourceId
              ? { ...s, status: 'indexing' as const, indexingProgress: 20, errorMessage: undefined }
              : s
          ),
        }))
        ApiService.reindexSource(sourceId).catch(() => {
          set((state) => ({
            sources: state.sources.map((s) =>
              s.id === sourceId ? { ...s, status: 'error' as const, errorMessage: 'Re-index failed' } : s
            ),
          }))
        })
      },

      updateSourceStatus: (sourceId: string, status: SourceIndexingStatus, progress?: number) =>
        set((state) => ({
          sources: state.sources.map((s) =>
            s.id === sourceId ? { ...s, status, indexingProgress: progress ?? s.indexingProgress } : s
          ),
        })),

      pollPendingSources: async () => {
        const state = get();
        const pending = state.sources.filter(
          (s) => s.status === 'indexing' || s.status === 'uploading' || (s.indexingProgress ?? 0) < 100
        );
        if (pending.length === 0) return;

        for (const source of pending) {
          try {
            const res = await ApiService.fetchSourceStatus(source.id);
            if (res && res.status) {
              const newStatus = res.status;
              const newProgress = newStatus === 'ready' ? 100 : (res.progress ?? source.indexingProgress ?? 50);
              set((st) => ({
                sources: st.sources.map((s) =>
                  s.id === source.id
                    ? {
                        ...s,
                        status: newStatus,
                        indexingProgress: newProgress,
                        errorMessage: res.errorMessage || s.errorMessage,
                      }
                    : s
                ),
              }));
            }
          } catch (err) {
            console.warn(`Failed to poll source status for ${source.id}:`, err);
          }
        }
      },

      fetchNotebookSources: async (notebookId: string) => {
        try {
          const { sources: fetchedSources } = await ApiService.getNotebookById(notebookId);
          set((state) => {
            const existingIds = new Set(fetchedSources.map((s) => s.id));
            const extraSources = state.sources.filter(
              (s) => s.notebookId === notebookId && !existingIds.has(s.id)
            );
            return {
              sources: [...fetchedSources, ...extraSources],
            };
          });
          get().fetchNotebookChatHistory(notebookId);
        } catch {
          // ignore error on fetch sources
        }
      },

      fetchNotebookChatHistory: async (notebookId: string) => {
        try {
          const convs = await ApiService.getNotebookConversations(notebookId)
          let activeSessionId = get().activeChatSessionId

          const resolvedActiveId =
            activeSessionId && convs.some((c: any) => c.id === activeSessionId)
              ? activeSessionId
              : convs[0]?.id ?? null

          let activeMessages: any[] = []
          if (resolvedActiveId) {
            try {
              activeMessages = await ApiService.getConversationMessages(resolvedActiveId)
            } catch {
              activeMessages = []
            }
          }

          const sessions: any[] = convs.map((conv: any, i: number) => ({
            id: conv.id,
            notebookId,
            title: conv.title || `Chat ${i + 1}`,
            createdAt: new Date(conv.createdAt || Date.now()),
            updatedAt: new Date(conv.updatedAt || Date.now()),
            messages: conv.id === resolvedActiveId ? activeMessages : [],
          }))

          set((state) => {
            const otherSessions = state.chatSessions.filter((s) => s.notebookId !== notebookId)
            return {
              activeNotebookId: notebookId,
              chatSessions: [...sessions, ...otherSessions],
              activeChatSessionId: resolvedActiveId,
              messages: activeMessages,
            }
          })
        } catch {
          // ignore fetch chat history error
        }
      },
    }),
    {
      name: 'chaibook-storage',
      partialize: (state) => ({
        theme: state.theme,
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
