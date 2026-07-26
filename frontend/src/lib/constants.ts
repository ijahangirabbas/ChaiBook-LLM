import type { NavItem, QuickAction, Feature, Notebook, Message, Source, SourceType } from '../types'

// Navigation items for Dashboard sidebar
export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'Home', path: '/dashboard' },
  { id: 'new-chat', label: 'New Chat', icon: 'MessageSquare', path: '/chat/new' },
  { id: 'notebooks', label: 'Notebooks', icon: 'BookOpen', path: '/notebooks' },
  { id: 'sources', label: 'Sources', icon: 'Database', path: '/sources' },
  { id: 'chats', label: 'Chats', icon: 'MessageCircle', path: '/chats' },
  { id: 'templates', label: 'Templates', icon: 'Layout', path: '/templates' },
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings' },
]

// Navigation items for Notebook/Chat sidebar
export const NOTEBOOK_NAV_ITEMS: NavItem[] = [
  { id: 'new-notebook', label: 'New Notebook', icon: 'Plus', path: '/notebook/new' },
  { id: 'notebooks', label: 'Notebooks', icon: 'BookOpen', path: '/notebooks' },
  { id: 'sources', label: 'Sources', icon: 'Database', path: '/sources' },
  { id: 'chats', label: 'Chats', icon: 'MessageCircle', path: '/chats' },
  { id: 'settings', label: 'Settings', icon: 'Settings', path: '/settings' },
]

// Quick action cards for Dashboard
export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Summarize key insights from your sources.',
    icon: 'FileText',
    color: 'indigo',
    prompt: 'Summarize the key insights from my sources.',
  },
  {
    id: 'explain',
    label: 'Explain',
    description: 'Explain a concept in simple terms.',
    icon: 'MessageCircle',
    color: 'green',
    prompt: 'Explain the main concepts from my sources in simple terms.',
  },
  {
    id: 'compare',
    label: 'Compare',
    description: 'Compare information across your sources.',
    icon: 'Layout',
    color: 'blue',
    prompt: 'Compare information and perspectives across my sources.',
  },
  {
    id: 'analyze',
    label: 'Analyze',
    description: 'Extract insights and find patterns.',
    icon: 'Zap',
    color: 'orange',
    prompt: 'Analyze my sources and identify key patterns and insights.',
  },
  {
    id: 'create',
    label: 'Create',
    description: 'Generate notes, plans or content.',
    icon: 'BookMarked',
    color: 'purple',
    prompt: 'Help me create structured notes and a plan based on my sources.',
  },
]

// Why users love Chaibook features
export const PRODUCT_FEATURES: Feature[] = [
  {
    id: 'trusted',
    title: 'Trusted & Accurate',
    description: 'Answers grounded in your sources with transparent citations.',
    icon: 'Shield',
  },
  {
    id: 'fast',
    title: 'Save Time',
    description: 'Get to the answers faster without reading everything end-to-end.',
    icon: 'Zap',
  },
  {
    id: 'organized',
    title: 'Organized Knowledge',
    description: 'Keep all your learning materials organized in powerful notebooks.',
    icon: 'BookOpen',
  },
  {
    id: 'private',
    title: 'Privacy First',
    description: 'Your data is encrypted and never used to train models.',
    icon: 'Shield',
  },
]

// Auth page features
export const AUTH_FEATURES = [
  {
    id: 'ai',
    title: 'Smart AI Conversations',
    description: 'Ask anything and get accurate, contextual answers.',
    icon: 'MessageSquare',
  },
  {
    id: 'sources',
    title: 'Multiple Sources',
    description: 'Add PDFs, YouTube videos, websites, text files, SRT/VTT subtitles, and more.',
    icon: 'Database',
  },
  {
    id: 'private',
    title: 'Private & Secure',
    description: 'Your data is encrypted and never used to train models.',
    icon: 'Shield',
  },
  {
    id: 'fast',
    title: 'Blazing Fast',
    description: 'Built for speed so you can focus on what matters.',
    icon: 'Zap',
  },
]

// Mock user
export const MOCK_USER = {
  id: 'user-1',
  name: 'Munna',
  email: 'munna@example.com',
  avatar: 'M',
  plan: 'free' as const,
  storage: {
    used: 4.2,
    total: 25,
  },
}

// Mock notebooks
export const MOCK_NOTEBOOKS: Notebook[] = [
  {
    id: 'nb-1',
    title: 'Machine Learning Notes',
    sourceCount: 12,
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    color: 'indigo',
    icon: 'BookOpen',
  },
  {
    id: 'nb-2',
    title: 'RAG Research',
    sourceCount: 8,
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    color: 'green',
    icon: 'Database',
  },
  {
    id: 'nb-3',
    title: 'Python Tutorials',
    sourceCount: 15,
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    color: 'blue',
    icon: 'FileText',
  },
  {
    id: 'nb-4',
    title: 'System Design',
    sourceCount: 10,
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    color: 'orange',
    icon: 'Layout',
  },
]

// Mock sources for a chat
export const MOCK_SOURCES: Source[] = [
  {
    id: 'src-1',
    notebookId: 'nb-1',
    type: 'webpage',
    title: 'What is RAG? | Pinecone Learn',
    url: 'https://pinecone.io/learn/rag',
    domain: 'pinecone.io/learn/rag',
    number: 1,
    status: 'ready',
    retrievedChunk: 'Retrieval Augmented Generation (RAG) is a method that combines information retrieval with large language models to produce more accurate and contextually relevant responses.',
    similarity: 0.94,
    charOffset: { start: 120, end: 310 },
  },
  {
    id: 'src-2',
    notebookId: 'nb-1',
    type: 'youtube',
    title: 'Retrieval Augmented Generation Explained',
    url: 'https://youtube.com/watch?v=GdjkfD93jU',
    domain: 'youtube.com',
    number: 2,
    status: 'ready',
    timelineSegment: { start: '2:23', startSeconds: 143, end: '3:45', endSeconds: 225 },
    transcript: [
      { timestamp: '2:23', seconds: 143, text: 'So in RAG, we first take the user query and use it to search our knowledge base.', isCited: true },
      { timestamp: '2:28', seconds: 148, text: 'We retrieve the most relevant chunks or documents that are informative.', isCited: true },
      { timestamp: '2:33', seconds: 153, text: 'Then we augment the prompt with this retrieved context.', isCited: true },
      { timestamp: '2:38', seconds: 158, text: 'Finally, the LLM generates the answer using both the question and the retrieved context.', isCited: true },
      { timestamp: '2:44', seconds: 164, text: 'This helps the model give accurate and up-to-date responses.' },
    ],
    similarity: 0.91,
    retrievedChunk: 'RAG combines retrieval with generation. The process: query → retrieve → augment → generate.',
  },
  {
    id: 'src-3',
    notebookId: 'nb-1',
    type: 'pdf',
    title: 'RAG: From Theory to Practice',
    url: 'https://docs.example.com/rag.pdf',
    domain: 'docs.example.com/rag.pdf',
    number: 3,
    status: 'ready',
    pageNumber: 4,
    totalPages: 18,
    bbox: { x1: 50, y1: 120, x2: 550, y2: 240 },
    similarity: 0.88,
    retrievedChunk: 'In practice, RAG systems consist of three main components: the retriever, the knowledge base, and the generator.',
  },
  {
    id: 'src-4',
    notebookId: 'nb-1',
    type: 'text',
    title: 'rag-notes.txt',
    domain: 'Uploaded by you',
    number: 4,
    status: 'ready',
    similarity: 0.82,
    retrievedChunk: 'Personal notes on RAG implementation strategies and best practices.',
  },
]

// Mock messages for chat
export const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'What is retrieval augmented generation (RAG)?',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: `Retrieval Augmented Generation (RAG) is a method that combines information retrieval with large language models (LLMs) to produce more accurate and contextually relevant responses. Instead of relying only on the model's pre-trained knowledge, RAG first retrieves relevant documents or passages from an external knowledge base, then uses those retrieved contexts to generate an informed answer.

**How it works:**

1. **Retrieve**: Find relevant documents from a knowledge base.
2. **Augment**: Add the retrieved content to the user's query.
3. **Generate**: The LLM uses the augmented context to generate a better response.

This helps reduce hallucinations and keeps answers up-to-date with your provided sources.`,
    timestamp: new Date(Date.now() - 4 * 60 * 1000),
    sources: MOCK_SOURCES,
  },
]

export interface SourceTypeStyle {
  label: string
  bgColor: string
  textColor: string
  darkBg: string
  darkText: string
  borderColor: string
  darkBorder: string
}

// Source type display config for all SourceTypes
export const SOURCE_TYPE_CONFIG: Record<SourceType, SourceTypeStyle> = {
  youtube: {
    label: 'YouTube',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    darkBg: 'dark:bg-red-950/40',
    darkText: 'dark:text-red-400',
    borderColor: 'border-red-100',
    darkBorder: 'dark:border-red-900/30',
  },
  pdf: {
    label: 'PDF',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    darkBg: 'dark:bg-red-950/40',
    darkText: 'dark:text-red-400',
    borderColor: 'border-red-100',
    darkBorder: 'dark:border-red-900/30',
  },
  webpage: {
    label: 'Web Page',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    darkBg: 'dark:bg-green-950/40',
    darkText: 'dark:text-green-400',
    borderColor: 'border-green-100',
    darkBorder: 'dark:border-green-900/30',
  },
  text: {
    label: 'Text File',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    darkBg: 'dark:bg-blue-950/40',
    darkText: 'dark:text-blue-400',
    borderColor: 'border-blue-100',
    darkBorder: 'dark:border-blue-900/30',
  },
  markdown: {
    label: 'Markdown',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    darkBg: 'dark:bg-purple-950/40',
    darkText: 'dark:text-purple-400',
    borderColor: 'border-purple-100',
    darkBorder: 'dark:border-purple-900/30',
  },
  word: {
    label: 'Word',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    darkBg: 'dark:bg-blue-950/40',
    darkText: 'dark:text-blue-400',
    borderColor: 'border-blue-100',
    darkBorder: 'dark:border-blue-900/30',
  },
  powerpoint: {
    label: 'PowerPoint',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
    darkBg: 'dark:bg-orange-950/40',
    darkText: 'dark:text-orange-400',
    borderColor: 'border-orange-100',
    darkBorder: 'dark:border-orange-900/30',
  },
  srt: {
    label: 'Subtitle (.srt)',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    darkBg: 'dark:bg-purple-950/40',
    darkText: 'dark:text-purple-400',
    borderColor: 'border-purple-100',
    darkBorder: 'dark:border-purple-900/30',
  },
  vtt: {
    label: 'Subtitle (.vtt)',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-600',
    darkBg: 'dark:bg-teal-950/40',
    darkText: 'dark:text-teal-400',
    borderColor: 'border-teal-100',
    darkBorder: 'dark:border-teal-900/30',
  },
}

export const RECENT_CHATS = [
  { id: 'chat-1', title: 'Untitled Notebook', notebookId: 'nb-chat-1', updatedAt: new Date() },
]
