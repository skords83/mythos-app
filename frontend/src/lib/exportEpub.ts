import { parseExportHtml } from './exportHtml'
import JSZip from 'jszip'

export function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

async function readImage(src: string): Promise<{ type: string; data: string }> {
  try {
    if (!src) throw new Error('Missing image source')
    const response = await fetch(src)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()
    let type = blob.type.split(';')[0].toLowerCase().replace('image/jpg', 'image/jpeg')
    let bytes: Uint8Array
    if (type === 'image/webp') {
      // EPUB 2 readers do not consistently support WebP.
      const bitmap = await createImageBitmap(blob)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas unavailable')
        context.drawImage(bitmap, 0, 0)
        return { type: 'png', data: canvas.toDataURL('image/png').split(',')[1] }
      } finally {
        bitmap.close()
      }
    }
    if (!['image/png', 'image/jpeg', 'image/gif'].includes(type)) throw new Error('Unsupported image type')
    bytes = new Uint8Array(await blob.arrayBuffer())
    if (!bytes.length) throw new Error('Empty image')
    let binary = ''
    bytes.forEach(byte => { binary += String.fromCharCode(byte) })
    return { type: type.slice(6), data: btoa(binary) }
  } catch {
    throw new Error('Ein Bild konnte nicht für den EPUB-Export geladen werden. Bitte prüfe, ob alle Bilder in der Geschichte und das Titelbild verfügbar sind.')
  }
}

export interface EpubChapter {
  title: string
  content: string
}

export async function buildEpubArchive(
  title: string,
  content: string | EpubChapter[],
  coverImage?: string | null,
  { includeTableOfContents = true }: { includeTableOfContents?: boolean } = {},
): Promise<JSZip> {
    const chapters = typeof content === 'string' ? [{ title, content }] : content
    if (!chapters.length) throw new Error('Es sind keine Kapitel für den EPUB-Export vorhanden.')
    // IDs and filenames depend on position, never on potentially duplicate titles.
    const entries = chapters.map((chapter, index) => ({
      ...chapter, id: `chapter-${index + 1}`, href: index === 0 ? 'content.xhtml' : `chapter-${index + 1}.xhtml`,
    }))
    const zip = new JSZip()
    const coverImageData = coverImage ? await readImage(coverImage) : null
    const images: { id: string; type: string; data: string }[] = []
    const sources = new Map<string, string>()
    for (const entry of entries) {
      const doc = parseExportHtml(entry.content)
      for (const image of Array.from(doc.body.querySelectorAll('img'))) {
        const src = image.getAttribute('src') || ''
        let path = sources.get(src)
        if (!path) {
          const asset = { id: `img${images.length}`, ...await readImage(src) }
          images.push(asset)
          path = `images/${asset.id}.${asset.type}`
          sources.set(src, path)
        }
        image.setAttribute('src', path)
        image.removeAttribute('srcset')
        image.removeAttribute('loading')
        if (!image.hasAttribute('alt')) image.setAttribute('alt', 'Bild')
        image.style.maxWidth = '100%'
        image.style.height = 'auto'
      }
      // HTML serialization leaves img/br tags open and named entities invalid in XML.
      const serializer = new XMLSerializer()
      const processedContent = Array.from(doc.body.childNodes).map(node => serializer.serializeToString(node)).join('')
      const coverHtml = coverImageData && entry === entries[0] ? `<div style="text-align: center; margin: 20px 0;"><img src="cover.${coverImageData.type}" alt="Cover" style="max-width: 200px;"/></div>` : ''
      const bookHeading = entry === entries[0] && title !== entry.title ? `<h1>${escapeXml(title)}</h1>` : ''
      entry.content = `${bookHeading}${coverHtml}<h1 id="${entry.id}">${escapeXml(entry.title)}</h1>${processedContent}`
    }
    const xhtml = (pageTitle: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head><title>${escapeXml(pageTitle)}</title></head><body>${body}</body></html>`
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
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
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>de</dc:language>
    <dc:identifier id="BookId">${bookId}</dc:identifier>
  </metadata>
  <manifest>
    ${entries.map(entry => `<item id="${entry.id}" href="${entry.href}" media-type="application/xhtml+xml"/>`).join('\n    ')}
    ${includeTableOfContents ? '<item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>' : ''}
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${images.map(img => `<item id="${img.id}" href="images/${img.id}.${img.type}" media-type="image/${img.type}"/>`).join('\n    ')}
    ${coverImageData ? `<item id="cover-image" href="cover.${coverImageData.type}" media-type="image/${coverImageData.type}"/>` : ''}
  </manifest>
  <spine toc="ncx">
    ${includeTableOfContents ? '<itemref idref="toc"/>' : ''}
    ${entries.map(entry => `<itemref idref="${entry.id}"/>`).join('\n    ')}
  </spine>
  ${includeTableOfContents ? '<guide><reference type="toc" title="Inhaltsverzeichnis" href="toc.xhtml"/></guide>' : ''}
</package>`

    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
    ${entries.map((entry, index) => `<navPoint id="navpoint-${index + 1}" playOrder="${index + 1}">
      <navLabel><text>${escapeXml(entry.title)}</text></navLabel>
      <content src="${entry.href}#${entry.id}"/>
    </navPoint>`).join('\n    ')}
  </navMap>
</ncx>`

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
    for (const entry of entries) zip.file(`OEBPS/${entry.href}`, xhtml(entry.title, entry.content))
    if (includeTableOfContents) {
      zip.file('OEBPS/toc.xhtml', xhtml('Inhaltsverzeichnis', `<h1>Inhaltsverzeichnis</h1><ol>${entries.map(entry => `<li><a href="${entry.href}#${entry.id}">${escapeXml(entry.title)}</a></li>`).join('')}</ol>`))
    }

    return zip
}
