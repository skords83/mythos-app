// C10: shared HTML -> block/run AST used by the Markdown, RTF and DOCX exporters
// in ExportModal.tsx. All three hand-roll their target format (no turndown/docx/
// epub-gen dependency), mirroring the project's existing hand-rolled EPUB export
// (jszip only, no new npm packages).

export type BlockType = 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'blockquote'

export interface TextRun {
  text: string
  bold?: boolean
  italic?: boolean
}

export interface Block {
  type: BlockType
  runs: TextRun[]
}

function collectRuns(node: ParentNode, bold = false, italic = false): TextRun[] {
  const runs: TextRun[] = []
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || ''
      if (text) runs.push({ text, bold, italic })
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement
      const tag = el.tagName.toLowerCase()
      if (tag === 'br') {
        runs.push({ text: '\n', bold, italic })
      } else if (tag === 'strong' || tag === 'b') {
        runs.push(...collectRuns(el, true, italic))
      } else if (tag === 'em' || tag === 'i') {
        runs.push(...collectRuns(el, bold, true))
      } else if (tag === 'img') {
        // skip - text-based formats have nowhere to embed the image data
      } else {
        runs.push(...collectRuns(el, bold, italic))
      }
    }
  })
  return runs
}

export function parseHtmlToBlocks(html: string): Block[] {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  const blocks: Block[] = []
  const walk = (el: ParentNode) => {
    Array.from((el as Element).children ?? []).forEach((child) => {
      const tag = child.tagName.toLowerCase()
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        blocks.push({ type: tag as 'h1' | 'h2' | 'h3', runs: collectRuns(child) })
      } else if (tag === 'p') {
        blocks.push({ type: 'p', runs: collectRuns(child) })
      } else if (tag === 'blockquote') {
        blocks.push({ type: 'blockquote', runs: collectRuns(child) })
      } else if (tag === 'ul' || tag === 'ol') {
        Array.from(child.children).forEach((li) => {
          if (li.tagName.toLowerCase() === 'li') blocks.push({ type: 'li', runs: collectRuns(li) })
        })
      } else if (tag === 'img') {
        // skip
      } else {
        walk(child)
      }
    })
  }
  walk(doc.body)
  return blocks
}

function runsToMarkdown(runs: TextRun[]): string {
  return runs
    .map((r) => {
      let t = r.text.replace(/\n/g, '  \n')
      if (r.bold) t = `**${t}**`
      if (r.italic) t = `_${t}_`
      return t
    })
    .join('')
}

export function blocksToMarkdown(blocks: Block[], title: string): string {
  const lines: string[] = [`# ${title}`, '']
  for (const block of blocks) {
    const text = runsToMarkdown(block.runs).trim()
    if (!text) continue
    switch (block.type) {
      case 'h1':
        lines.push(`## ${text}`)
        break
      case 'h2':
        lines.push(`### ${text}`)
        break
      case 'h3':
        lines.push(`#### ${text}`)
        break
      case 'blockquote':
        lines.push(`> ${text}`)
        break
      case 'li':
        lines.push(`- ${text}`)
        break
      default:
        lines.push(text)
    }
    lines.push('')
  }
  return lines.join('\n')
}

function escapeRtf(text: string): string {
  let out = ''
  for (const ch of Array.from(text)) {
    const code = ch.codePointAt(0)!
    if (ch === '\\' || ch === '{' || ch === '}') {
      out += '\\' + ch
    } else if (ch === '\n') {
      out += '\\line '
    } else if (code > 126) {
      out += `\\u${code}?`
    } else {
      out += ch
    }
  }
  return out
}

function runsToRtf(runs: TextRun[]): string {
  return runs
    .map((r) => {
      let t = escapeRtf(r.text)
      if (r.bold) t = `{\\b ${t}}`
      if (r.italic) t = `{\\i ${t}}`
      return t
    })
    .join('')
}

export function blocksToRtf(blocks: Block[], title: string): string {
  const parts: string[] = [`{\\b\\fs36 ${escapeRtf(title)}}\\par\\par`]
  for (const block of blocks) {
    const text = runsToRtf(block.runs)
    if (!text.trim()) continue
    switch (block.type) {
      case 'h1':
        parts.push(`{\\b\\fs32 ${text}}\\par\\par`)
        break
      case 'h2':
        parts.push(`{\\b\\fs28 ${text}}\\par\\par`)
        break
      case 'h3':
        parts.push(`{\\b\\fs24 ${text}}\\par\\par`)
        break
      case 'li':
        parts.push(`\\bullet\\tab ${text}\\par`)
        break
      case 'blockquote':
        parts.push(`{\\i ${text}}\\par\\par`)
        break
      default:
        parts.push(`${text}\\par\\par`)
    }
  }
  return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fswiss Arial;}}\\f0\\fs24\n${parts.join('\n')}\n}`
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function runsToDocxXml(runs: TextRun[], forceBullet = false): string {
  const withBullet = forceBullet ? [{ text: '• ', bold: false, italic: false }, ...runs] : runs
  return withBullet
    .map((r) => {
      const props: string[] = []
      if (r.bold) props.push('<w:b/>')
      if (r.italic) props.push('<w:i/>')
      const rPr = props.length ? `<w:rPr>${props.join('')}</w:rPr>` : ''
      const text = escapeXml(r.text).replace(/\n/g, '</w:t></w:r><w:r><w:br/><w:t xml:space="preserve">')
      return `<w:r>${rPr}<w:t xml:space="preserve">${text}</w:t></w:r>`
    })
    .join('')
}

const DOCX_STYLE_BY_BLOCK: Partial<Record<BlockType, string>> = {
  h1: 'Heading1',
  h2: 'Heading2',
  h3: 'Heading3',
}

function blockToDocxParagraph(block: Block): string {
  const styleId = DOCX_STYLE_BY_BLOCK[block.type]
  const pPr = styleId ? `<w:pPr><w:pStyle w:val="${styleId}"/></w:pPr>` : ''
  return `<w:p>${pPr}${runsToDocxXml(block.runs, block.type === 'li')}</w:p>`
}

export function blocksToDocxDocumentXml(blocks: Block[], title: string): string {
  const titlePara = `<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(title)}</w:t></w:r></w:p>`
  const body = blocks.map(blockToDocxParagraph).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${titlePara}
    ${body}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417"/></w:sectPr>
  </w:body>
</w:document>`
}

const DOCX_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`

const DOCX_PACKAGE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

const DOCX_DOCUMENT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`

const DOCX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="240"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="48"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
</w:styles>`

export async function buildDocxBlob(blocks: Block[], title: string): Promise<Blob> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  zip.file('[Content_Types].xml', DOCX_CONTENT_TYPES)
  zip.file('_rels/.rels', DOCX_PACKAGE_RELS)
  zip.file('word/_rels/document.xml.rels', DOCX_DOCUMENT_RELS)
  zip.file('word/styles.xml', DOCX_STYLES)
  zip.file('word/document.xml', blocksToDocxDocumentXml(blocks, title))
  return zip.generateAsync({ type: 'blob' })
}
