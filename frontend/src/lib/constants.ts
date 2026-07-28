import type { NavItem, QuickAction, Feature, SourceType } from '../types'

// Navigation items for Dashboard sidebar
export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'Home', path: '/dashboard' },
  // { id: 'new-chat', label: 'New Chat', icon: 'MessageSquare', path: '/chat/new' },
  { id: 'notebooks', label: 'Notebooks', icon: 'BookOpen', path: '/notebooks' },
  { id: 'sources', label: 'Sources', icon: 'Database', path: '/sources' },
  { id: 'chats', label: 'Chats', icon: 'MessageCircle', path: '/chats' },
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

