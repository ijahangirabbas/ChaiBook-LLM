import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Globe, FileText, FileCode, ArrowLeft, Upload, Link, Plus
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'
import type { SourceType } from '../../types'

type Step = 'select' | 'configure'

import { ApiService } from '../../services/api.service'

export function AddSourceModal() {
  const { addSourceModalOpen, setAddSourceModalOpen, activeNotebookId, notebooks, addSource, addNotebook } = useAppStore()
  const [step, setStep] = useState<Step>('select')
  const [selectedType, setSelectedType] = useState<SourceType | null>(null)

  // Configure states
  const [urlInput, setUrlInput] = useState('')
  const [textInput, setTextInput] = useState('')
  const [textMode, setTextMode] = useState<'upload' | 'paste'>('paste')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentNotebookId = activeNotebookId || notebooks[0]?.id

  const handleClose = () => {
    setAddSourceModalOpen(false)
    setTimeout(() => {
      setStep('select')
      setSelectedType(null)
      setUrlInput('')
      setTextInput('')
      setTextMode('paste')
      setSelectedFile(null)
      setUploadedFileName(null)
      setIsSubmitting(false)
    }, 200)
  }

  const handleSelectType = (type: SourceType) => {
    setSelectedType(type)
    setStep('configure')
  }

  const handleBack = () => {
    setStep('select')
    setSelectedType(null)
    setUrlInput('')
    setTextInput('')
    setSelectedFile(null)
    setUploadedFileName(null)
  }

  const handleSubmit = async () => {
    if (!selectedType) return
    setIsSubmitting(true)

    try {
      let targetNotebookId = currentNotebookId
      if (!targetNotebookId) {
        const created = await ApiService.createNotebook({
          title: 'Active Research Notebook',
          color: 'indigo',
          icon: 'BookOpen',
        })
        addNotebook(created)
        targetNotebookId = created.id
      }

      if (selectedFile) {
        const res = await ApiService.uploadSourceFile(targetNotebookId, selectedFile)
        addSource({
          id: res.sourceId,
          notebookId: targetNotebookId,
          type: selectedType,
          title: selectedFile.name,
          domain: selectedFile.name,
          number: Math.floor(Math.random() * 10) + 1,
          status: 'indexing',
          indexingProgress: 25,
        })
      } else if (urlInput.trim()) {
        const res = await ApiService.addSourceUrl(
          targetNotebookId,
          urlInput.trim(),
          selectedType === 'youtube' ? 'youtube' : 'webpage'
        )
        let domainStr = 'webpage'
        try {
          domainStr = new URL(urlInput.trim()).hostname
        } catch {
          // ignore
        }
        addSource({
          id: res.sourceId,
          notebookId: targetNotebookId,
          type: selectedType,
          title: urlInput.trim(),
          url: urlInput.trim(),
          domain: domainStr,
          number: Math.floor(Math.random() * 10) + 1,
          status: 'indexing',
          indexingProgress: 25,
        })
      } else if (textInput.trim()) {
        const titleSnippet = textInput.trim().slice(0, 30) + '...'
        const res = await ApiService.addSourceContent(targetNotebookId, titleSnippet, textInput.trim())
        addSource({
          id: res.sourceId,
          notebookId: targetNotebookId,
          type: 'text',
          title: titleSnippet,
          domain: 'Pasted Text',
          number: Math.floor(Math.random() * 10) + 1,
          status: 'indexing',
          indexingProgress: 25,
        })
      } else {
        throw new Error('Please select a file, enter a valid URL, or paste text before submitting.')
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to add this source.')
      return
    } finally {
      setIsSubmitting(false)
      handleClose()
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      setSelectedFile(file)
      setUploadedFileName(file.name)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setUploadedFileName(file.name)
    }
  }

  return (
    <AnimatePresence>
      {addSourceModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Modal Container: Positioned in the EXACT CENTER of the webpage */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: 'calc(-50% - 10px)' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: 'calc(-50% - 10px)' }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            className={cn(
              'fixed z-50 top-1/2 left-1/2',
              'w-[calc(100vw-32px)] max-w-lg',
              "bg-card dark:bg-[#0A0A0A]",
              "rounded-[24px] shadow-2xl dark:shadow-none",
              "border border-border dark:border-[#1C1C1C]",
              "overflow-hidden",
            )}
            role="dialog"
            aria-modal="true"
            aria-label="Add source"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-[#1C1C1C]">
              <div className="flex items-center gap-3">
                {step === "configure" && (
                  <button
                    onClick={handleBack}
                    className="p-1 rounded-lg text-text-muted hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    aria-label="Go back to select source type"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="text-base font-bold text-text-primary dark:text-text-primary-dark">
                  {step === "select"
                    ? "Add Source"
                    : `Add ${selectedType?.toUpperCase() || "Source"}`}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full text-text-muted hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {step === "select" ? (
                /* STEP 1: Select Source Box Cards */
                <div className="space-y-4">
                  <p className="text-xs text-text-muted dark:text-text-muted-dark">
                    Select a source type to add to your notebook workspace:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* YouTube */}
                    <button
                      onClick={() => handleSelectType("youtube")}
                      className={cn(
                        "flex flex-col items-center justify-center text-center p-4 rounded-2xl border",
                        "bg-card dark:bg-[#0F0F0F] border-border dark:border-[#1C1C1C]",
                        "hover:border-red-500/50 hover:bg-red-50/30 dark:hover:bg-red-950/10",
                        "transition-all duration-150 group",
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-2.5">
                        <div className="w-6 h-6 bg-red-600 rounded-md flex items-center justify-center">
                          <svg
                            viewBox="0 0 24 24"
                            fill="white"
                            className="w-3.5 h-3.5"
                          >
                            <path d="M10 15l5.19-3L10 9v6zm11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
                        YouTube
                      </span>
                      <span className="text-[10px] text-text-muted dark:text-text-muted-dark mt-0.5">
                        Video URL link
                      </span>
                    </button>

                    {/* Web Page */}
                    <button
                      onClick={() => handleSelectType("webpage")}
                      className={cn(
                        "flex flex-col items-center justify-center text-center p-4 rounded-2xl border",
                        "bg-card dark:bg-[#0F0F0F] border-border dark:border-[#1C1C1C]",
                        "hover:border-green-500/50 hover:bg-green-50/30 dark:hover:bg-green-950/10",
                        "transition-all duration-150 group",
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950/30 flex items-center justify-center mb-2.5">
                        <Globe className="w-5 h-5 text-green-500" />
                      </div>
                      <span className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
                        Web Page
                      </span>
                      <span className="text-[10px] text-text-muted dark:text-text-muted-dark mt-0.5">
                        Website URL
                      </span>
                    </button>

                    {/* Text File (.txt) */}
                    <button
                      onClick={() => handleSelectType("text")}
                      className={cn(
                        "flex flex-col items-center justify-center text-center p-4 rounded-2xl border",
                        "bg-card dark:bg-[#0F0F0F] border-border dark:border-[#1C1C1C]",
                        "hover:border-blue-500/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/10",
                        "transition-all duration-150 group",
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mb-2.5">
                        <FileText className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
                        Text (.txt)
                      </span>
                      <span className="text-[10px] text-text-muted dark:text-text-muted-dark mt-0.5">
                        Paste or upload
                      </span>
                    </button>

                    {/* PDF Document */}
                    <button
                      onClick={() => handleSelectType("pdf")}
                      className={cn(
                        "flex flex-col items-center justify-center text-center p-4 rounded-2xl border",
                        "bg-card dark:bg-[#0F0F0F] border-border dark:border-[#1C1C1C]",
                        "hover:border-red-500/50 hover:bg-red-50/30 dark:hover:bg-red-950/10",
                        "transition-all duration-150 group",
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-2.5">
                        <div className="w-6 h-6 bg-red-500 rounded-md flex items-center justify-center">
                          <span className="text-white text-[8px] font-bold">
                            PDF
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
                        PDF Document
                      </span>
                      <span className="text-[10px] text-text-muted dark:text-text-muted-dark mt-0.5">
                        Upload PDF file
                      </span>
                    </button>

                    {/* Subtitles (.srt / .vtt) */}
                    <button
                      onClick={() => handleSelectType("srt")}
                      className={cn(
                        "flex flex-col items-center justify-center text-center p-4 rounded-2xl border col-span-2 sm:col-span-2",
                        "bg-card dark:bg-[#0F0F0F] border-border dark:border-[#1C1C1C]",
                        "hover:border-purple-500/50 hover:bg-purple-50/30 dark:hover:bg-purple-950/10",
                        "transition-all duration-150 group",
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center mb-2.5">
                        <FileCode className="w-5 h-5 text-purple-500" />
                      </div>
                      <span className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
                        Subtitles (.srt / .vtt)
                      </span>
                      <span className="text-[10px] text-text-muted dark:text-text-muted-dark mt-0.5">
                        Upload video subtitle files
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: Configure Selected Source */
                <div className="space-y-5">
                  {/* YouTube or Web Page Link Input */}
                  {(selectedType === "youtube" ||
                    selectedType === "webpage") && (
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold text-text-primary dark:text-text-primary-dark">
                        {selectedType === "youtube"
                          ? "YouTube Video URL"
                          : "Web Page URL"}
                      </label>
                      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card dark:bg-[#0F0F0F] border border-border dark:border-[#1C1C1C]">
                        <Link className="w-4 h-4 text-text-muted shrink-0" />
                        <input
                          type="url"
                          placeholder={
                            selectedType === "youtube"
                              ? "https://www.youtube.com/watch?v=..."
                              : "https://example.com/article"
                          }
                          value={urlInput}
                          onChange={(e) => setUrlInput(e.target.value)}
                          className="flex-1 bg-transparent text-sm text-text-primary dark:text-text-primary-dark placeholder:text-text-muted focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                  )}

                  {/* Text File (.txt) Mode: Upload or Copy-Paste */}
                  {selectedType === "text" && (
                    <div className="space-y-4">
                      {/* Sub-tabs */}
                      <div className="flex rounded-xl bg-gray-100 dark:bg-white/5 p-1">
                        <button
                          onClick={() => setTextMode("paste")}
                          className={cn(
                            "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                            textMode === "paste"
                              ? "bg-card dark:bg-[#1C1C1C] text-text-primary dark:text-text-primary-dark shadow-sm"
                              : "text-text-muted hover:text-text-primary dark:hover:text-text-primary-dark",
                          )}
                        >
                          Copy & Paste Text
                        </button>
                        <button
                          onClick={() => setTextMode("upload")}
                          className={cn(
                            "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
                            textMode === "upload"
                              ? "bg-card dark:bg-[#1C1C1C] text-text-primary dark:text-text-primary-dark shadow-sm"
                              : "text-text-muted hover:text-text-primary dark:hover:text-text-primary-dark",
                          )}
                        >
                          Upload File (.txt)
                        </button>
                      </div>

                      {textMode === "paste" ? (
                        <div className="space-y-2">
                          <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder="Paste text content directly here..."
                            rows={6}
                            className={cn(
                              "w-full p-4 rounded-2xl resize-none text-sm",
                              "bg-card dark:bg-[#0F0F0F] border border-border dark:border-[#1C1C1C]",
                              "text-text-primary dark:text-text-primary-dark placeholder:text-text-muted",
                              "focus:outline-none focus:border-primary",
                            )}
                          />
                        </div>
                      ) : (
                        /* Dropzone for txt file */
                        <div
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={cn(
                            "border-2 border-dashed rounded-2xl p-8 text-center transition-all relative",
                            dragActive
                              ? "border-primary bg-primary/5"
                              : "border-border dark:border-[#1C1C1C]",
                            uploadedFileName && "border-success bg-success/5",
                          )}
                        >
                          <input
                            type="file"
                            accept=".txt"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                          <p className="text-xs font-semibold text-text-primary dark:text-text-primary-dark">
                            {uploadedFileName
                              ? uploadedFileName
                              : "Drag & drop .txt file here, or click to browse"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* PDF or Subtitle (.srt/.vtt) Upload Dropzone */}
                  {(selectedType === "pdf" ||
                    selectedType === "srt" ||
                    selectedType === "vtt") && (
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-10 text-center transition-all relative",
                        dragActive
                          ? "border-primary bg-primary/5"
                          : "border-border dark:border-[#1C1C1C]",
                        uploadedFileName && "border-success bg-success/5",
                      )}
                    >
                      <input
                        type="file"
                        accept={selectedType === "pdf" ? ".pdf" : ".srt,.vtt"}
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
                      <p className="text-sm font-semibold text-text-primary dark:text-text-primary-dark mb-1">
                        {uploadedFileName
                          ? uploadedFileName
                          : `Drag & drop ${selectedType === "pdf" ? ".pdf" : ".srt / .vtt"} file here`}
                      </p>
                      <p className="text-xs text-text-muted">
                        or click to select from your computer
                      </p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={cn(
                      "w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white",
                      "bg-[#5B46F6] hover:bg-[#4F39F6] transition-colors",
                      "flex items-center justify-center gap-2 shadow-sm",
                    )}
                  >
                    {isSubmitting ? (
                      <span className="animate-pulse">Adding source...</span>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add Source to Notebook
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
