'use client'

import React, { useState } from 'react'
import { Download, FileText, Book, X } from 'lucide-react'
import { Chapter, Project } from './types'
import { extractContent } from '../hooks/useChapters'
import { parseHtmlToBlocks, blocksToMarkdown, blocksToRtf, buildDocxBlob } from '@/lib/exportConvert'
import { OVERLAY, MODAL_PANEL, ACCENT, RADIUS, BUTTON_SECONDARY, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from '@/lib/theme'
import { MastheadDivider } from './MastheadDivider'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  project: Project | null
  chapters: Chapter[]
  selectedChapter?: Chapter | null
}

type ExportFormat = 'pdf' | 'epub' | 'markdown' | 'docx' | 'rtf'

const FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: 'PDF',
  epub: 'ePub',
  markdown: 'Markdown',
  docx: 'DOCX',
  rtf: 'RTF',
}

function sanitizeFilename(title: string): string {
  return title.replace(/[^a-z0-9]/gi, '_')
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadTextFile(filename: string, mimeType: string, text: string) {
  downloadBlob(filename, new Blob([text], { type: mimeType }))
}

export function ExportModal({ isOpen, onClose, project, chapters, selectedChapter }: ExportModalProps) {
  const [exportType, setExportType] = useState<'project' | 'chapter'>(selectedChapter ? 'chapter' : 'project')
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  if (!isOpen || !project) return null

  const exportPDF = async (title: string, content: string) => {
    const { default: html2pdf } = await import('html2pdf.js')

    const element = document.createElement('div')
    element.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <h1 style="font-size: 24px; margin-bottom: 20px;">${title}</h1>
        <div style="line-height: 1.6;">${content}</div>
      </div>
    `

    const opt = {
      margin: 10,
      filename: `${sanitizeFilename(title)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    await html2pdf().set(opt).from(element).save()
  }

  const exportEpub = async (title: string, content: string) => {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()

    // Cover-Bild aus dem Projekt
    let coverImageData: { type: string, data: string } | null = null
    if (project!.coverImage) {
      const match = project!.coverImage.match(/data:image\/([^;]+);base64,(.+)/)
      if (match) {
        coverImageData = { type: match[1] || 'png', data: match[2] }
      }
    }

    // Base64-Bilder extrahieren und durch Platzhalter ersetzen
    const imageRegex = /<img[^>]+src="data:image\/([^;]+);base64,([^"]+)"[^>]*>/g
    const images: { id: string, type: string, data: string }[] = []
    let imgCounter = 0

    let processedContent = content.replace(imageRegex, (match, type, data) => {
      const id = `img${imgCounter++}`
      images.push({ id, type: type || 'png', data })
      return `[BILD: ${id}]`
    })

    // Bild-Platzhalter durch ePub-Bildreferenzen ersetzen
    images.forEach(img => {
      processedContent = processedContent.replace(`[BILD: ${img.id}]`,
        `<img src="images/${img.id}.${img.type}" alt="Bild" style="max-width: 100%;"/>`)
    })

    zip.file('mimetype', 'application/epub+zip')
    zip.file('META-INF/container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

    const bookId = `book-${Date.now()}`

    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${title}</dc:title>
    <dc:language>de</dc:language>
    <dc:identifier id="BookId">${bookId}</dc:identifier>
  </metadata>
  <manifest>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${images.map(img => `<item id="${img.id}" href="images/${img.id}.${img.type}" media-type="image/${img.type}"/>`).join('\n    ')}
    ${coverImageData ? `<item id="cover-image" href="cover.${coverImageData.type}" media-type="image/${coverImageData.type}"/>` : ''}
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`

    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>${title}</text></navLabel>
      <content src="content.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`

    const coverHtml = coverImageData ? `<div style="text-align: center; margin: 20px 0;"><img src="cover.${coverImageData.type}" alt="Cover" style="max-width: 200px;"/></div>` : ''

    const contentXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${title}</title></head>
<body>
<h1>${title}</h1>
${coverHtml}
${processedContent}
</body>
</html>`

    // Cover-Bild hinzufügen
    if (coverImageData) {
      const binary = atob(coverImageData.data)
      const array = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i)
      }
      zip.file(`OEBPS/cover.${coverImageData.type}`, array)
    }

    // Bilder hinzufügen
    images.forEach(img => {
      const binary = atob(img.data)
      const array = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i)
      }
      zip.file(`OEBPS/images/${img.id}.${img.type}`, array)
    })

    zip.file('OEBPS/content.opf', contentOpf)
    zip.file('OEBPS/toc.ncx', tocNcx)
    zip.file('OEBPS/content.xhtml', contentXhtml)

    const blob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(`${sanitizeFilename(title)}.epub`, blob)
  }

  const gatherContent = (): { title: string; html: string } => {
    if (exportType === 'chapter' && selectedChapter) {
      return { title: selectedChapter.title, html: extractContent(selectedChapter.content) }
    }
    // Ganzes Projekt - alle Kapitel zusammenfassen
    const sortedChapters = [...chapters].sort((a, b) => a.id.localeCompare(b.id))
    const html = sortedChapters
      .map(ch => `<h2>${ch.title}</h2><p>${extractContent(ch.content)}</p>`)
      .join('<br/><br/>')
    return { title: project!.title, html }
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportError(null)
    try {
      const { title, html } = gatherContent()

      if (format === 'pdf') {
        const coverImg = project!.coverImage ? `<img src="${project!.coverImage}" style="max-width: 300px; float: right; margin-left: 20px;"/>` : ''
        await exportPDF(title, `${coverImg}${html}`)
      } else if (format === 'epub') {
        await exportEpub(title, html)
      } else if (format === 'markdown') {
        const blocks = parseHtmlToBlocks(html)
        downloadTextFile(`${sanitizeFilename(title)}.md`, 'text/markdown', blocksToMarkdown(blocks, title))
      } else if (format === 'rtf') {
        const blocks = parseHtmlToBlocks(html)
        downloadTextFile(`${sanitizeFilename(title)}.rtf`, 'application/rtf', blocksToRtf(blocks, title))
      } else if (format === 'docx') {
        const blocks = parseHtmlToBlocks(html)
        const blob = await buildDocxBlob(blocks, title)
        downloadBlob(`${sanitizeFilename(title)}.docx`, blob)
      }
    } catch (error) {
      console.error('Export error:', error)
      setExportError('Export fehlgeschlagen. Bitte versuche es erneut.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className={OVERLAY}>
      <div className={`${MODAL_PANEL} p-6 w-full max-w-md`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-display font-light ${TEXT_PRIMARY}`}>
            Exportieren
          </h2>
          <button onClick={onClose} className={`${TEXT_MUTED} hover:text-zinc-600 dark:hover:text-zinc-300`}>
            <X size={20} />
          </button>
        </div>
        <MastheadDivider surface="bg-stone-50 dark:bg-zinc-900" className="mb-4" />

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-2`}>
              Was möchtest du exportieren?
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportType('project')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 ${RADIUS} border transition-colors ${
                  exportType === 'project'
                    ? `${ACCENT} text-white border-indigo-600`
                    : `${BUTTON_SECONDARY}`
                }`}
              >
                <Book size={18} />
                Ganzes Projekt
              </button>
              <button
                onClick={() => setExportType('chapter')}
                disabled={!selectedChapter}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 ${RADIUS} border transition-colors ${
                  exportType === 'chapter'
                    ? `${ACCENT} text-white border-indigo-600`
                    : `${BUTTON_SECONDARY}`
                } ${!selectedChapter ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FileText size={18} />
                Aktuelles Kapitel
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${TEXT_SECONDARY} mb-2`}>
              Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-3 py-2 text-sm ${RADIUS} border transition-colors ${
                    format === f
                      ? `${ACCENT} text-white border-indigo-600`
                      : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {FORMAT_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {exportError && (
            <p className="text-sm text-red-600 dark:text-red-400">{exportError}</p>
          )}

          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 ${ACCENT} text-white ${RADIUS} transition-colors disabled:opacity-50`}
          >
            <Download size={18} />
            {isExporting ? 'Exportiere...' : 'Herunterladen'}
          </button>
        </div>
      </div>
    </div>
  )
}
