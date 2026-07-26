import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Database } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { SourceCard } from '../SourceCard/SourceCard';
import { cn } from '../../lib/utils';

export function SourcesModal() {
  const {
    sourcesModalOpen,
    setSourcesModalOpen,
    setAddSourceModalOpen,
    sources,
    activeNotebookId,
    notebooks,
    openSourceInspector,
    activeSourceId,
  } = useAppStore();

  if (!sourcesModalOpen) return null;

  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId) || notebooks[0];
  const activeNotebookSources = activeNotebookId
    ? sources.filter((s) => !s.notebookId || s.notebookId === activeNotebookId)
    : sources;

  const readyCount = activeNotebookSources.filter((s) => s.status === 'ready').length;
  const indexingCount = activeNotebookSources.filter((s) => s.status === 'indexing' || s.status === 'uploading').length;
  const errorCount = activeNotebookSources.filter((s) => s.status === 'error').length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden',
            'bg-card dark:bg-[#0F0F12] border border-border dark:border-[#222228]'
          )}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-border-dark shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">
                  Sources for {activeNotebook?.title || 'Notebook'}
                </h2>
                <p className="text-xs text-text-muted dark:text-text-muted-dark">
                  {activeNotebookSources.length} total source(s) linked to this workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSourcesModalOpen(false);
                  setAddSourceModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Source
              </button>
              <button
                onClick={() => setSourcesModalOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-text-muted hover:text-text-primary transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Dot Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-b border-border dark:border-border-dark text-xs font-medium shrink-0">
            <span className="text-text-muted dark:text-text-muted-dark font-semibold">
              Indexing Status Legend:
            </span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span>🟢 Ready ({readyCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <span>🟡 Indexing ({indexingCount})</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <span>🔴 Failed ({errorCount})</span>
              </div>
            </div>
          </div>

          {/* Sources List Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeNotebookSources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 text-text-muted">
                  <Database className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-text-primary dark:text-text-primary-dark mb-1">
                  No sources added yet
                </h3>
                <p className="text-xs text-text-muted dark:text-text-muted-dark max-w-sm mb-4">
                  Upload PDFs (e.g. lldm.pdf), YouTube transcripts, web articles or notes to ground your answers.
                </p>
                <button
                  onClick={() => {
                    setSourcesModalOpen(false);
                    setAddSourceModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  Upload First Source
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeNotebookSources.map((source) => (
                  <div key={source.id} className="relative group">
                    <SourceCard
                      source={source}
                      onClick={() => {
                        openSourceInspector(source.id);
                      }}
                      isActive={activeSourceId === source.id}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-black/40 border-t border-border dark:border-border-dark text-xs text-text-muted dark:text-text-muted-dark shrink-0">
            <span>Click any source to inspect chunk vectors or retries</span>
            <button
              onClick={() => setSourcesModalOpen(false)}
              className="px-4 py-1.5 rounded-lg border border-border dark:border-border-dark hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
