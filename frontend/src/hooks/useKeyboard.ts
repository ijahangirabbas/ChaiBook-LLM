import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

export function useKeyboard() {
  const { setSearchOpen, sourceInspectorOpen, closeSourceInspector, addSourceModalOpen, setAddSourceModalOpen } = useAppStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K → open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }

      // Escape → close modals/panels
      if (e.key === 'Escape') {
        if (sourceInspectorOpen) closeSourceInspector()
        if (addSourceModalOpen) setAddSourceModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sourceInspectorOpen, addSourceModalOpen, setSearchOpen, closeSourceInspector, setAddSourceModalOpen])
}
