'use client'

import React, { useState } from 'react'
import { Download, FileText, Book, X } from 'lucide-react'

interface Chapter {
  id: string
  title: string
  content: string
}

interface Project {
  id: string
  title: string
  description: string | null
}

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  chapters: Chapter[]
  selectedChapter?: Chapter | null
}

export function ExportModal({ isOpen, onClose, project, chapters, selectedChapter }: ExportModalProps) {
  const [exportType, setExportType] = useState<'project' | 'chapter'>(selectedChapter ? 'chapter' : 'project')
  const [format, setFormat] = useState<'pdf' | 'epub'>('pdf')
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen || !project) return null

  const stripHtml = (html: string) => {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  const exportPDF = async (title: string, content: string) => {
    const html2pdf = (await import('html2pdf.js')).default as any
    
    const element = document.createElement('div')
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 24px; margin-bottom: 20px;">${title}</h1>
        <div style="line-height: 1.6;">${content}</div>
      </div>
    `
    
    const opt = {
      margin: 10,
      filename: `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    await html2pdf().set(opt).from(element).save()
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      let title = project.title
      let content = ''

      if (exportType === 'chapter' && selectedChapter) {
        title = selectedChapter.title
        content = selectedChapter.content
      } else {
        // Ganzes Projekt - alle Kapitel zusammenfügen
        const sortedChapters = [...chapters].sort((a, b) => a.id.localeCompare(b.id))
        content = sortedChapters.map(ch => 
          `<h2>${ch.title}</h2><p>${ch.content}</p>`
        ).join('<br/><br/>')
      }

      if (format === 'pdf') {
        await exportPDF(title, content)
      } else {
        // ePub Export - einfache Implementierung
        alert('ePub Export wird in Kürze verfügbar sein. Bitte vorerst PDF verwenden.')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Export fehlgeschlagen')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-[#262626] rounded-xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-gray-100">
            Exportieren
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Was möchtest du exportieren?
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportType('project')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  exportType === 'project'
                    ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Book size={16} />
                Ganzes Projekt
              </button>
              <button
                onClick={() => setExportType('chapter')}
                disabled={!selectedChapter}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  exportType === 'chapter'
                    ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                } ${!selectedChapter ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FileText size={16} />
                Aktuelles Kapitel
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('pdf')}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                  format === 'pdf'
                    ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                PDF
              </button>
              <button
                onClick={() => setFormat('epub')}
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                  format === 'epub'
                    ? 'bg-[#4A7C59] text-white border-[#4A7C59]'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                ePub
              </button>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6349] transition-colors disabled:opacity-50"
          >
            <Download size={18} />
            {isExporting ? 'Exportiere...' : 'Herunterladen'}
          </button>
        </div>
      </div>
    </div>
  )
}