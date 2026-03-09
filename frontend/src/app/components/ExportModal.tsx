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
    const loadScript = () => {
      return new Promise<void>((resolve, reject) => {
        if ((window as any).html2pdf) {
          resolve()
          return
        }
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load html2pdf'))
        document.head.appendChild(script)
      })
    }
    
    await loadScript()
    const html2pdf = (window as any).html2pdf
    
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
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()

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
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${title}</dc:title>
    <dc:language>de</dc:language>
    <dc:identifier id="bookid">${bookId}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    ${images.map(img => `<item id="${img.id}" href="images/${img.id}.${img.type}" media-type="image/${img.type}"/>`).join('\n    ')}
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

      const contentXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${title}</title></head>
<body>
<h1>${title}</h1>
${processedContent}
</body>
</html>`

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
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.epub`
      a.click()
      URL.revokeObjectURL(url)
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