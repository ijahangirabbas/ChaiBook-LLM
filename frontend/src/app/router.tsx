import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { AuthenticateWithRedirectCallback, useAuth } from '@clerk/clerk-react'
import { AuthLayout } from './layouts/AuthLayout'
import { AppLayout } from './layouts/AppLayout'
import { useAppStore } from '../store/useAppStore'

// Lazy-loaded pages
const LoginPage = lazy(() => import('./pages/Login/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })))
const NotebooksPage = lazy(() => import('./pages/Notebooks/NotebooksPage').then(m => ({ default: m.NotebooksPage })))
const NotebookPage = lazy(() => import('./pages/Notebook/NotebookPage').then(m => ({ default: m.NotebookPage })))
const ChatsPage = lazy(() => import('./pages/Chats/ChatsPage').then(m => ({ default: m.ChatsPage })))
const SourcesPage = lazy(() => import('./pages/Sources/SourcesPage').then(m => ({ default: m.SourcesPage })))
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage').then(m => ({ default: m.ProfilePage })))
const ChatPage = lazy(() => import('./pages/Chat/ChatPage').then(m => ({ default: m.ChatPage })))

// Loading fallback
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-background dark:bg-background-dark">
      <div className="flex flex-col items-center gap-3">
        <div className="text-3xl animate-bounce">☕</div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Auth guard component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppStore()
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <PageLoader />

  const authenticated = Boolean(isSignedIn || isAuthenticated)
  if (!authenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

// Public route (redirect if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppStore()
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <PageLoader />

  const authenticated = Boolean(isSignedIn || isAuthenticated)
  if (authenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

const router = createBrowserRouter([
  // Auth routes
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/',
        element: (
          <PublicRoute>
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          </PublicRoute>
        ),
      },
      {
        path: '/sso-callback',
        element: (
          <AuthenticateWithRedirectCallback
            signUpForceRedirectUrl="/dashboard"
            signInForceRedirectUrl="/dashboard"
          />
        ),
      },
    ],
  },

  // App routes (Dashboard mode)
  {
    element: (
      <ProtectedRoute>
        <AppLayout sidebarMode="dashboard" />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: '/notebooks',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotebooksPage />
          </Suspense>
        ),
      },
      {
        path: '/sources',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SourcesPage />
          </Suspense>
        ),
      },
      {
        path: '/chats',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChatsPage />
          </Suspense>
        ),
      },
      {
        path: '/settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: '/profile',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProfilePage />
          </Suspense>
        ),
      },
    ],
  },

  // Notebook & Chat routes (Notebook mode: Chai / ChaiBook LLM)
  {
    element: (
      <ProtectedRoute>
        <AppLayout sidebarMode="notebook" />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/notebook/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotebookPage />
          </Suspense>
        ),
      },
      {
        path: '/notebook/new',
        element: (
          <Suspense fallback={<PageLoader />}>
            <NotebookPage />
          </Suspense>
        ),
      },
      {
        path: '/chat/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChatPage />
          </Suspense>
        ),
      },
      {
        path: '/chat/new',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChatPage />
          </Suspense>
        ),
      },
    ],
  },

  // Catch-all
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

export function Router() {
  return <RouterProvider router={router} />
}

